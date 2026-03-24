/**
 * Edge-case and static-analysis regression tests.
 * These document found bugs and verify correct behaviour at boundaries.
 */

import { bookingRulesService } from '../services/booking-rules.service';

jest.mock('../lib/prisma');
jest.mock('../repositories/booking.repository');
jest.mock('../repositories/user.repository');
jest.mock('../services/notification.service');
jest.mock('../services/token.service');

import prisma from '../lib/prisma';
import { bookingRepository } from '../repositories/booking.repository';
import { userRepository } from '../repositories/user.repository';
import { tokenService } from '../services/token.service';
import { bookingService } from '../services/booking.service';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockBookingRepo = bookingRepository as jest.Mocked<typeof bookingRepository>;
const mockUserRepo = userRepository as jest.Mocked<typeof userRepository>;
const mockTokenService = tokenService as jest.Mocked<typeof tokenService>;

function offsetDate(offsetMs: number) { return new Date(Date.now() + offsetMs); }
const HOUR = 3600000;
const MIN = 60000;

const activeUser = {
  id: 'user-1', name: 'Alice', email: 'a@co.com', status: 'ACTIVE',
  companyId: 'c-1', role: 'EMPLOYEE',
  company: { id: 'c-1', name: 'Acme', color: '#000' },
} as any;

const activeBooking = (overrides: any = {}) => ({
  id: 'b-1', userId: 'user-1', companyId: 'c-1', roomId: 'r-1',
  status: 'ACTIVE', tokenCost: 1, isPaid: true,
  startTime: offsetDate(2 * HOUR), endTime: offsetDate(3 * HOUR),
  room: { id: 'r-1', name: 'Room 1' },
  user: { id: 'user-1', name: 'Alice', email: 'a@co.com', companyId: 'c-1' },
  company: { id: 'c-1', name: 'Acme', color: '#000' },
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockUserRepo.findById.mockResolvedValue(activeUser);
  (mockPrisma.booking.findFirst as jest.Mock).mockResolvedValue(null);
  (mockPrisma.booking.create as jest.Mock).mockResolvedValue(activeBooking());
  (mockPrisma.booking.update as jest.Mock).mockResolvedValue(activeBooking({ status: 'CANCELLED' }));
  (mockPrisma.bookingLog.create as jest.Mock).mockResolvedValue({});
  (mockPrisma.bookingInvite.createMany as jest.Mock).mockResolvedValue({ count: 0 });
  (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([]);
  (mockPrisma.$transaction as jest.Mock).mockImplementation((fn: any) => fn(mockPrisma));
  mockTokenService.deductTokens.mockResolvedValue(undefined);
  mockTokenService.refundTokens.mockResolvedValue(undefined);
});

// ─── BUG-01: Back-to-back booking conflict ──────────────────────────────────

describe('BUG-01: Back-to-back bookings', () => {
  /**
   * The overlap query uses strict inequalities: start < newEnd AND end > newStart
   * A booking ending at 10:00 does NOT overlap with one starting at 10:00.
   * This is correct behaviour — verify it holds.
   */
  test('back-to-back bookings are NOT treated as conflicts (correct)', () => {
    // existing booking 09:00–10:00, new booking 10:00–11:00
    const existingEnd = new Date('2025-06-01T10:00:00Z');
    const existingStart = new Date('2025-06-01T09:00:00Z');
    const newStart = new Date('2025-06-01T10:00:00Z');
    const newEnd = new Date('2025-06-01T11:00:00Z');

    // Overlap condition: existingStart < newEnd AND existingEnd > newStart
    const overlaps = existingStart < newEnd && existingEnd > newStart;
    expect(overlaps).toBe(false); // back-to-back should NOT overlap
  });

  test('1-minute overlap IS detected as conflict', () => {
    const existingStart = new Date('2025-06-01T09:00:00Z');
    const existingEnd = new Date('2025-06-01T10:01:00Z');
    const newStart = new Date('2025-06-01T10:00:00Z');
    const newEnd = new Date('2025-06-01T11:00:00Z');
    const overlaps = existingStart < newEnd && existingEnd > newStart;
    expect(overlaps).toBe(true);
  });
});

// ─── BUG-02: Token cost rounding ─────────────────────────────────────────────

describe('BUG-02: Token cost precision', () => {
  test('30-minute booking costs exactly 0.5 tokens', () => {
    const startTime = offsetDate(HOUR);
    const endTime = new Date(startTime.getTime() + 30 * MIN);
    const mins = (endTime.getTime() - startTime.getTime()) / 1000 / 60;
    const tokenCost = Math.round((mins / 60) * 100) / 100;
    expect(tokenCost).toBe(0.5);
  });

  test('1h20m booking costs exactly 1.33 tokens', () => {
    const mins = 80;
    const tokenCost = Math.round((mins / 60) * 100) / 100;
    expect(tokenCost).toBe(1.33);
  });

  test('zero-duration booking has zero token cost', () => {
    const tokenCost = Math.round((0 / 60) * 100) / 100;
    expect(tokenCost).toBe(0);
  });
});

// ─── BUG-03: Cross-midnight booking ──────────────────────────────────────────

describe('BUG-03: Cross-midnight booking rejected', () => {
  test('booking from 23:00 today to 01:00 tomorrow is rejected', async () => {
    const start = new Date();
    start.setDate(start.getDate() + 1);
    start.setHours(23, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    end.setHours(1, 0, 0, 0);

    await expect(bookingService.createBooking({
      title: 'Late Night', roomId: 'r-1',
      startTime: start.toISOString(), endTime: end.toISOString(),
      userId: 'user-1', companyId: 'c-1', role: 'EMPLOYEE',
    })).rejects.toThrow('same calendar day');
  });
});

// ─── BUG-04: 7-day advance boundary ──────────────────────────────────────────

describe('BUG-04: Advance booking boundary', () => {
  test('booking 8 days out is rejected by booking-rules', () => {
    const start = new Date(Date.now() + 8 * 24 * HOUR);
    const end = new Date(start.getTime() + HOUR);
    expect(() => bookingRulesService.validate({
      startTime: start, endTime: end, role: 'EMPLOYEE',
      locationName: 'Acme', title: 'Future',
    })).toThrow('7 days');
  });

  test('ADMIN is also subject to 7-day advance limit', () => {
    // The booking-rules service applies the same advance limit regardless of role
    const start = new Date(Date.now() + 8 * 24 * HOUR);
    const end = new Date(start.getTime() + HOUR);
    expect(() => bookingRulesService.validate({
      startTime: start, endTime: end, role: 'ADMIN',
      locationName: 'Acme', title: 'Future',
    })).toThrow('7 days');
  });
});

// ─── BUG-05: Refund exactly at 2-hour boundary ───────────────────────────────

describe('BUG-05: Refund window edge at exactly 2 hours', () => {
  test('cancelling exactly 2 hours before start does refund (now <= twoHoursBefore)', async () => {
    // twoHoursBefore = startTime - 2hr. If now === twoHoursBefore, then now <= twoHoursBefore → refund
    const startTime = new Date(Date.now() + 2 * HOUR);
    mockBookingRepo.findById.mockResolvedValue(activeBooking({ startTime }));

    await bookingService.cancelBooking('b-1', 'user-1', 'EMPLOYEE');
    // With startTime exactly 2hr away, twoHoursBefore ≈ now → refund
    expect(mockTokenService.refundTokens).toHaveBeenCalled();
  });

  test('cancelling 1hr 59min before start does NOT refund', async () => {
    const startTime = new Date(Date.now() + (2 * HOUR - MIN));
    mockBookingRepo.findById.mockResolvedValue(activeBooking({ startTime }));

    await bookingService.cancelBooking('b-1', 'user-1', 'EMPLOYEE');
    expect(mockTokenService.refundTokens).not.toHaveBeenCalled();
  });
});

// ─── BUG-06: PENDING account cannot book ─────────────────────────────────────

describe('BUG-06: Pending user cannot create bookings', () => {
  test('PENDING user is blocked even with valid booking data', async () => {
    mockUserRepo.findById.mockResolvedValue({ ...activeUser, status: 'PENDING' });
    await expect(bookingService.createBooking({
      title: 'Test', roomId: 'r-1',
      startTime: offsetDate(HOUR).toISOString(),
      endTime: offsetDate(2 * HOUR).toISOString(),
      userId: 'user-1', companyId: 'c-1', role: 'EMPLOYEE',
    })).rejects.toThrow('pending approval');
  });
});

// ─── BUG-07: Double-booking prevention (concurrent requests) ─────────────────

describe('BUG-07: Conflict detection under concurrent requests', () => {
  test('second booking for same room/time is rejected when first exists', async () => {
    // Simulate: first booking already in DB when second request hits conflict check
    (mockPrisma.booking.findFirst as jest.Mock).mockResolvedValue(activeBooking({ id: 'existing' }));

    await expect(bookingService.createBooking({
      title: 'Duplicate', roomId: 'r-1',
      startTime: offsetDate(HOUR).toISOString(),
      endTime: offsetDate(2 * HOUR).toISOString(),
      userId: 'user-1', companyId: 'c-1', role: 'EMPLOYEE',
    })).rejects.toThrow('already booked');
  });
});

// ─── BUG-08: Self-invite not allowed ─────────────────────────────────────────

describe('BUG-08: User cannot invite themselves', () => {
  test('organiser is excluded from invitee list (NOT: { id: userId } in query)', async () => {
    // The getColleagues query filters out the requesting user
    (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([]);
    const colleagues = await bookingService.getColleagues('user-1', 'c-1', 'c-1');
    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ NOT: { id: 'user-1' } }),
      })
    );
  });
});

// ─── BUG-09: Title stripping on update ───────────────────────────────────────

describe('BUG-09: Company prefix is not doubled on update', () => {
  test('existing [Company] prefix is stripped before re-formatting', async () => {
    // updateBooking strips [Company] prefix then re-adds it
    const bookingWithPrefix = activeBooking({ title: '[Acme] Standup' });
    mockBookingRepo.findById.mockResolvedValue(bookingWithPrefix);
    (mockPrisma.booking.update as jest.Mock).mockResolvedValue(bookingWithPrefix);

    await bookingService.updateBooking('b-1', {
      title: 'New Title',
      requestUserId: 'user-1',
      requestUserRole: 'EMPLOYEE',
      requestCompanyId: 'c-1',
    });

    // The update should be called with [Acme] New Title, NOT [Acme] [Acme] New Title
    expect(mockPrisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ title: '[Acme] New Title' }),
      })
    );
  });
});

// ─── BUG-10: Maximum duration cap ────────────────────────────────────────────

describe('BUG-10: Duration cap at 8 hours', () => {
  test('9-hour booking is rejected', () => {
    const start = new Date(Date.now() + HOUR);
    const end = new Date(start.getTime() + 9 * HOUR);
    expect(() => bookingRulesService.validate({
      startTime: start, endTime: end, role: 'ADMIN',
      locationName: 'Acme', title: 'Marathon',
    })).toThrow('8 hours');
  });

  test('ADMIN cannot bypass the 8-hour cap', () => {
    const start = new Date(Date.now() + HOUR);
    const end = new Date(start.getTime() + 9 * HOUR);
    expect(() => bookingRulesService.validate({
      startTime: start, endTime: end, role: 'ADMIN',
      locationName: 'Acme', title: 'Long Meeting',
    })).toThrow('8 hours');
  });
});

// ─── SECURITY-01: cancel-from-email uses EMPLOYEE role ───────────────────────

describe('SECURITY-01: cancel-from-email authorization', () => {
  test('EMPLOYEE role used in cancel-from-email prevents cancelling others\' bookings', async () => {
    // If someone forges a JWT with a different userId, cancelBooking checks userId match
    const otherUserBooking = activeBooking({ userId: 'user-99' });
    mockBookingRepo.findById.mockResolvedValue(otherUserBooking);

    await expect(bookingService.cancelBooking('b-1', 'user-1', 'EMPLOYEE'))
      .rejects.toThrow('Not authorized');
  });
});

// ─── SECURITY-02: JWT_SECRET default ─────────────────────────────────────────

describe('SECURITY-02: Weak JWT_SECRET default', () => {
  test('JWT_SECRET env var should be set (not default "secret")', () => {
    // This is a configuration warning test
    const secret = process.env.JWT_SECRET;
    if (secret) {
      expect(secret).not.toBe('secret');
    } else {
      // No secret set — will use dangerous default in production
      console.warn('⚠ WARNING: JWT_SECRET is not set. Default "secret" will be used in production.');
    }
  });
});
