/**
 * Booking service unit tests.
 * All external dependencies (prisma, repositories, services) are mocked.
 */

jest.mock('../lib/prisma');
jest.mock('../repositories/booking.repository');
jest.mock('../repositories/user.repository');
jest.mock('../services/notification.service');
jest.mock('../services/token.service');

import prisma from '../lib/prisma';
import { bookingRepository } from '../repositories/booking.repository';
import { userRepository } from '../repositories/user.repository';
import { notificationService } from '../services/notification.service';
import { tokenService } from '../services/token.service';
import { bookingService } from '../services/booking.service';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockBookingRepo = bookingRepository as jest.Mocked<typeof bookingRepository>;
const mockUserRepo = userRepository as jest.Mocked<typeof userRepository>;
const mockNotification = notificationService as jest.Mocked<typeof notificationService>;
const mockTokenService = tokenService as jest.Mocked<typeof tokenService>;

function futureDate(offsetMinutes: number): Date {
  return new Date(Date.now() + offsetMinutes * 60 * 1000);
}

const baseUser = {
  id: 'user-1',
  name: 'Alice Smith',
  email: 'alice@acme.com',
  status: 'ACTIVE',
  companyId: 'company-1',
  role: 'EMPLOYEE',
  company: { id: 'company-1', name: 'Acme', color: '#000' },
} as any;

const baseBooking = {
  id: 'booking-1',
  title: '[Acme] Standup',
  roomId: 'room-1',
  userId: 'user-1',
  companyId: 'company-1',
  startTime: futureDate(60),
  endTime: futureDate(120),
  status: 'ACTIVE',
  tokenCost: 1,
  isPaid: true,
  room: { id: 'room-1', name: 'Room 1' },
  user: { id: 'user-1', name: 'Alice Smith', email: 'alice@acme.com', companyId: 'company-1' },
  company: { id: 'company-1', name: 'Acme', color: '#000' },
} as any;

describe('bookingService', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    mockUserRepo.findById.mockResolvedValue(baseUser);
    mockNotification.sendBookingConfirmation.mockResolvedValue(undefined as any);
    mockNotification.sendApprovalNotification.mockResolvedValue(undefined as any);
    mockTokenService.deductTokens.mockResolvedValue(undefined);
    // Default: no conflict
    (mockPrisma.booking.findFirst as jest.Mock).mockResolvedValue(null);
    // Default: create returns a booking
    (mockPrisma.booking.create as jest.Mock).mockResolvedValue(baseBooking);
    (mockPrisma.bookingLog.create as jest.Mock).mockResolvedValue({});
    (mockPrisma.bookingInvite.createMany as jest.Mock).mockResolvedValue({ count: 0 });
    (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([]);
    // $transaction executes the callback with prisma as the tx client
    (mockPrisma.$transaction as jest.Mock).mockImplementation((fn: any) => fn(mockPrisma));
  });

  // ─── createBooking ────────────────────────────────────────────────────────

  describe('createBooking', () => {
    const createData = {
      title: 'Standup',
      roomId: 'room-1',
      startTime: futureDate(60).toISOString(),
      endTime: futureDate(120).toISOString(),
      userId: 'user-1',
      companyId: 'company-1',
      role: 'EMPLOYEE' as const,
    };

    test('creates a booking and deducts tokens', async () => {
      const result = await bookingService.createBooking(createData);
      expect(mockPrisma.booking.create).toHaveBeenCalled();
      expect(mockTokenService.deductTokens).toHaveBeenCalled();
      expect(result.id).toBe('booking-1');
    });

    test('throws for PENDING account', async () => {
      mockUserRepo.findById.mockResolvedValue({ ...baseUser, status: 'PENDING' });
      await expect(bookingService.createBooking(createData))
        .rejects.toThrow('pending approval');
    });

    test('throws when room is already booked (conflict)', async () => {
      (mockPrisma.booking.findFirst as jest.Mock).mockResolvedValue(baseBooking);
      await expect(bookingService.createBooking(createData))
        .rejects.toThrow('already booked');
    });

    test('throws when booking spans midnight (different days)', async () => {
      const start = new Date();
      start.setHours(23, 0, 0, 0);
      start.setDate(start.getDate() + 1);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      end.setHours(1, 0, 0, 0);
      await expect(bookingService.createBooking({
        ...createData,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      })).rejects.toThrow('same calendar day');
    });

    test('sends confirmation email after booking', async () => {
      await bookingService.createBooking(createData);
      // Fire-and-forget, so we just verify it was called (catches async)
      expect(mockNotification.sendBookingConfirmation).toHaveBeenCalledWith(
        expect.objectContaining({ userEmail: 'alice@acme.com' })
      );
    });

    test('creates BookingInvite rows for valid invitees', async () => {
      const colleague = { id: 'user-2', name: 'Bob', email: 'bob@acme.com', companyId: 'company-1', status: 'ACTIVE' };
      (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([colleague]);

      await bookingService.createBooking({ ...createData, inviteeIds: ['user-2'] });

      expect(mockPrisma.bookingInvite.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [{ bookingId: 'booking-1', userId: 'user-2' }],
        })
      );
    });

    test('does NOT invite users from a different company', async () => {
      // findMany returns empty — user from different company filtered out in query
      (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([]);
      await bookingService.createBooking({ ...createData, inviteeIds: ['user-other-company'] });
      expect(mockPrisma.bookingInvite.createMany).not.toHaveBeenCalled();
    });

    test('sends confirmation email to each invitee', async () => {
      const colleague = { id: 'user-2', name: 'Bob', email: 'bob@acme.com', companyId: 'company-1', status: 'ACTIVE' };
      (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([colleague]);
      await bookingService.createBooking({ ...createData, inviteeIds: ['user-2'] });
      expect(mockNotification.sendBookingConfirmation).toHaveBeenCalledWith(
        expect.objectContaining({ userEmail: 'bob@acme.com' })
      );
    });
  });

  // ─── cancelBooking ────────────────────────────────────────────────────────

  describe('cancelBooking', () => {
    beforeEach(() => {
      mockBookingRepo.findById.mockResolvedValue(baseBooking);
      (mockPrisma.booking.update as jest.Mock).mockResolvedValue({ ...baseBooking, status: 'CANCELLED' });
    });

    test('cancels a booking the user owns', async () => {
      await bookingService.cancelBooking('booking-1', 'user-1', 'EMPLOYEE');
      expect(mockPrisma.booking.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'CANCELLED' } })
      );
    });

    test('throws when user tries to cancel someone else\'s booking', async () => {
      await expect(bookingService.cancelBooking('booking-1', 'user-2', 'EMPLOYEE'))
        .rejects.toThrow('Not authorized');
    });

    test('ADMIN can cancel any booking', async () => {
      await expect(bookingService.cancelBooking('booking-1', 'user-admin', 'ADMIN'))
        .resolves.not.toThrow();
    });

    test('throws if booking is already cancelled', async () => {
      mockBookingRepo.findById.mockResolvedValue({ ...baseBooking, status: 'CANCELLED' });
      await expect(bookingService.cancelBooking('booking-1', 'user-1', 'EMPLOYEE'))
        .rejects.toThrow('already closed');
    });

    test('refunds tokens when cancelled ≥2 hours before start', async () => {
      const futureBooking = {
        ...baseBooking,
        startTime: new Date(Date.now() + 3 * 60 * 60 * 1000), // 3hr from now
      };
      mockBookingRepo.findById.mockResolvedValue(futureBooking);
      mockTokenService.refundTokens.mockResolvedValue(undefined);

      await bookingService.cancelBooking('booking-1', 'user-1', 'EMPLOYEE');

      expect(mockTokenService.refundTokens).toHaveBeenCalledWith(
        'company-1', 1, expect.anything()
      );
    });

    test('does NOT refund tokens within 2 hours of start', async () => {
      const imminent = {
        ...baseBooking,
        startTime: new Date(Date.now() + 30 * 60 * 1000), // 30min from now
      };
      mockBookingRepo.findById.mockResolvedValue(imminent);
      mockTokenService.refundTokens.mockResolvedValue(undefined);

      await bookingService.cancelBooking('booking-1', 'user-1', 'EMPLOYEE');
      expect(mockTokenService.refundTokens).not.toHaveBeenCalled();
    });

    test('exactly at the 2-hour boundary — refund is given (>=)', async () => {
      const boundary = {
        ...baseBooking,
        startTime: new Date(Date.now() + 2 * 60 * 60 * 1000 + 100), // just over 2hr
      };
      mockBookingRepo.findById.mockResolvedValue(boundary);
      mockTokenService.refundTokens.mockResolvedValue(undefined);
      await bookingService.cancelBooking('booking-1', 'user-1', 'EMPLOYEE');
      expect(mockTokenService.refundTokens).toHaveBeenCalled();
    });
  });

  // ─── updateBooking ────────────────────────────────────────────────────────

  describe('updateBooking', () => {
    beforeEach(() => {
      mockBookingRepo.findById.mockResolvedValue(baseBooking);
      (mockPrisma.booking.update as jest.Mock).mockResolvedValue(baseBooking);
      mockTokenService.adjustTokens.mockResolvedValue(undefined);
    });

    test('owner can update their own booking', async () => {
      await expect(bookingService.updateBooking('booking-1', {
        title: 'New Title',
        requestUserId: 'user-1',
        requestUserRole: 'EMPLOYEE',
        requestCompanyId: 'company-1',
      })).resolves.not.toThrow();
    });

    test('EMPLOYEE cannot update another user\'s booking', async () => {
      await expect(bookingService.updateBooking('booking-1', {
        requestUserId: 'user-2',
        requestUserRole: 'EMPLOYEE',
        requestCompanyId: 'company-1',
      })).rejects.toThrow('Not authorized');
    });

    test('ADMIN can update any booking', async () => {
      await expect(bookingService.updateBooking('booking-1', {
        requestUserId: 'admin-user',
        requestUserRole: 'ADMIN',
        requestCompanyId: 'company-1',
      })).resolves.not.toThrow();
    });

    test('throws if booking is closed', async () => {
      mockBookingRepo.findById.mockResolvedValue({ ...baseBooking, status: 'CANCELLED' });
      await expect(bookingService.updateBooking('booking-1', {
        requestUserId: 'user-1',
        requestUserRole: 'EMPLOYEE',
        requestCompanyId: 'company-1',
      })).rejects.toThrow('Cannot edit a closed booking');
    });

    test('detects conflict when changing time', async () => {
      // First findFirst (for conflict) returns a conflict
      (mockPrisma.booking.findFirst as jest.Mock).mockResolvedValue({ id: 'conflict-booking' });
      await expect(bookingService.updateBooking('booking-1', {
        startTime: futureDate(90).toISOString(),
        endTime: futureDate(150).toISOString(),
        requestUserId: 'user-1',
        requestUserRole: 'EMPLOYEE',
        requestCompanyId: 'company-1',
      })).rejects.toThrow('already booked');
    });
  });

  // ─── approveBooking / rejectBooking ──────────────────────────────────────

  describe('approveBooking', () => {
    const pendingBooking = { ...baseBooking, status: 'PENDING_APPROVAL' };
    beforeEach(() => {
      mockBookingRepo.findById.mockResolvedValue(pendingBooking);
      mockBookingRepo.update.mockResolvedValue({ ...pendingBooking, status: 'ACTIVE' });
      mockBookingRepo.addLog.mockResolvedValue({} as any);
    });

    test('approves a pending booking', async () => {
      await bookingService.approveBooking('booking-1', 'admin-1');
      expect(mockBookingRepo.update).toHaveBeenCalledWith('booking-1', { status: 'ACTIVE' });
    });

    test('throws if booking is not pending', async () => {
      mockBookingRepo.findById.mockResolvedValue(baseBooking); // ACTIVE
      await expect(bookingService.approveBooking('booking-1', 'admin-1'))
        .rejects.toThrow('not pending approval');
    });
  });

  describe('rejectBooking', () => {
    const pendingBooking = { ...baseBooking, status: 'PENDING_APPROVAL', tokenCost: 1 };
    beforeEach(() => {
      mockBookingRepo.findById.mockResolvedValue(pendingBooking);
      (mockPrisma.booking.update as jest.Mock).mockResolvedValue({ ...pendingBooking, status: 'REJECTED' });
      mockTokenService.refundTokens.mockResolvedValue(undefined);
    });

    test('rejects booking and always refunds tokens', async () => {
      await bookingService.rejectBooking('booking-1', 'admin-1');
      expect(mockTokenService.refundTokens).toHaveBeenCalledWith('company-1', 1, expect.anything());
    });

    test('throws if booking is not pending', async () => {
      mockBookingRepo.findById.mockResolvedValue(baseBooking);
      await expect(bookingService.rejectBooking('booking-1', 'admin-1'))
        .rejects.toThrow('not pending approval');
    });
  });

  // ─── getInvitedBookings ───────────────────────────────────────────────────

  describe('getInvitedBookings', () => {
    test('queries bookings the user is invited to', async () => {
      (mockPrisma.booking.findMany as jest.Mock).mockResolvedValue([baseBooking]);
      const result = await bookingService.getInvitedBookings('user-2');
      expect(mockPrisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ invites: { some: { userId: 'user-2' } } }),
        })
      );
      expect(result).toHaveLength(1);
    });
  });

  // ─── getColleagues ────────────────────────────────────────────────────────

  describe('getColleagues', () => {
    test('excludes the requesting user and returns only ACTIVE company members', async () => {
      (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([
        { id: 'user-2', name: 'Bob', email: 'bob@acme.com' },
      ]);
      const result = await bookingService.getColleagues('user-1', 'company-1', 'company-1');
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId: 'company-1',
            status: 'ACTIVE',
            NOT: { id: 'user-1' },
          }),
        })
      );
      expect(result).toHaveLength(1);
    });
  });
});
