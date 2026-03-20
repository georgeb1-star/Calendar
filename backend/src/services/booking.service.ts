import { bookingRepository } from '../repositories/booking.repository';
import { userRepository } from '../repositories/user.repository';
import { bookingRulesService } from './booking-rules.service';
import { notificationService } from './notification.service';
import { tokenService } from './token.service';
import prisma from '../lib/prisma';

const bookingWithDetails = {
  room: true,
  user: { select: { id: true, name: true, email: true, companyId: true } },
  company: { select: { id: true, name: true, color: true } },
} as const;

function calcTokenCost(startTime: Date, endTime: Date): number {
  const mins = (endTime.getTime() - startTime.getTime()) / 1000 / 60;
  return Math.round((mins / 60) * 100) / 100;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export const bookingService = {
  async getAllBookings() {
    return bookingRepository.findAll();
  },

  async getUserBookings(userId: string) {
    return bookingRepository.findByUser(userId);
  },

  async createBooking(data: {
    title: string;
    roomId: string;
    startTime: string;
    endTime: string;
    notes?: string;
    userId: string;
    companyId: string;
    role: 'EMPLOYEE' | 'ADMIN';
  }) {
    const user = await userRepository.findById(data.userId);
    if (!user) throw new Error('User not found');

    const startTime = new Date(data.startTime);
    const endTime = new Date(data.endTime);

    if (!isSameDay(startTime, endTime)) {
      throw new Error('Booking must start and end on the same calendar day');
    }

    const tokenCost = calcTokenCost(startTime, endTime);

    const { status, durationHours, formattedTitle } = bookingRulesService.validate({
      startTime,
      endTime,
      role: data.role,
      companyName: user.company.name,
      title: data.title,
    });

    const booking = await prisma.$transaction(async (tx) => {
      // Check conflict
      const conflict = await tx.booking.findFirst({
        where: {
          roomId: data.roomId,
          status: { notIn: ['CANCELLED', 'REJECTED', 'NO_SHOW'] },
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
      });
      if (conflict) {
        throw new Error('This room is already booked during that time. Please choose a different time or room.');
      }

      // Deduct tokens
      await tokenService.deductTokens(data.companyId, tokenCost, tx);

      // Create booking
      const created = await tx.booking.create({
        data: {
          title: formattedTitle,
          roomId: data.roomId,
          userId: data.userId,
          companyId: data.companyId,
          startTime,
          endTime,
          durationHours,
          status,
          notes: data.notes,
          tokenCost,
        },
        include: bookingWithDetails,
      });

      await tx.bookingLog.create({
        data: {
          bookingId: created.id,
          action: 'CREATED',
          actorId: data.userId,
          metadata: { status, durationHours, tokenCost } as any,
        },
      });

      return created;
    });

    notificationService.sendBookingConfirmation({
      userEmail: user.email,
      userName: user.name,
      bookingTitle: formattedTitle,
      roomName: booking.room.name,
      startTime,
      endTime,
      status,
    }).catch(console.error);

    return booking;
  },

  async updateBooking(bookingId: string, data: {
    title?: string;
    startTime?: string;
    endTime?: string;
    notes?: string;
    requestUserId: string;
    requestUserRole: 'EMPLOYEE' | 'ADMIN';
    requestCompanyId: string;
  }) {
    const existing = await bookingRepository.findById(bookingId);
    if (!existing) throw new Error('Booking not found');

    if (existing.userId !== data.requestUserId && data.requestUserRole !== 'ADMIN') {
      throw new Error('Not authorized to edit this booking');
    }

    if (['CANCELLED', 'REJECTED', 'NO_SHOW', 'COMPLETED'].includes(existing.status)) {
      throw new Error('Cannot edit a closed booking');
    }

    const user = await userRepository.findById(existing.userId);
    if (!user) throw new Error('User not found');

    const startTime = data.startTime ? new Date(data.startTime) : existing.startTime;
    const endTime = data.endTime ? new Date(data.endTime) : existing.endTime;

    if (data.startTime || data.endTime) {
      if (!isSameDay(startTime, endTime)) {
        throw new Error('Booking must start and end on the same calendar day');
      }
    }

    const rawTitle = data.title
      ? data.title.replace(/^\[.*?\]\s*/, '')
      : existing.title.replace(/^\[.*?\]\s*/, '');

    const { status, durationHours, formattedTitle } = bookingRulesService.validate({
      startTime,
      endTime,
      role: data.requestUserRole,
      companyName: user.company.name,
      title: rawTitle,
    });

    const newTokenCost = calcTokenCost(startTime, endTime);

    const updated = await prisma.$transaction(async (tx) => {
      if (data.startTime || data.endTime) {
        const conflict = await tx.booking.findFirst({
          where: {
            roomId: existing.roomId,
            status: { notIn: ['CANCELLED', 'REJECTED', 'NO_SHOW'] },
            startTime: { lt: endTime },
            endTime: { gt: startTime },
            id: { not: bookingId },
          },
        });
        if (conflict) {
          throw new Error('This room is already booked during that time. Please choose a different time or room.');
        }
      }

      await tokenService.adjustTokens(existing.companyId, existing.tokenCost, newTokenCost, tx);

      const result = await tx.booking.update({
        where: { id: bookingId },
        data: {
          title: formattedTitle,
          startTime,
          endTime,
          durationHours,
          status,
          notes: data.notes,
          tokenCost: newTokenCost,
        },
        include: bookingWithDetails,
      });

      await tx.bookingLog.create({
        data: {
          bookingId,
          action: 'UPDATED',
          actorId: data.requestUserId,
          metadata: { newTokenCost, oldTokenCost: existing.tokenCost } as any,
        },
      });

      return result;
    });

    return updated;
  },

  async cancelBooking(bookingId: string, requestUserId: string, requestUserRole: 'EMPLOYEE' | 'ADMIN') {
    const existing = await bookingRepository.findById(bookingId);
    if (!existing) throw new Error('Booking not found');

    if (existing.userId !== requestUserId && requestUserRole !== 'ADMIN') {
      throw new Error('Not authorized to cancel this booking');
    }

    if (['CANCELLED', 'REJECTED', 'NO_SHOW', 'COMPLETED'].includes(existing.status)) {
      throw new Error('Booking is already closed');
    }

    // Check refund eligibility: must cancel ≥2 hours before start
    const now = new Date();
    const twoHoursBefore = new Date(existing.startTime.getTime() - 2 * 60 * 60 * 1000);
    const isRefundEligible = now <= twoHoursBefore;

    const updated = await prisma.$transaction(async (tx) => {
      if (isRefundEligible && existing.tokenCost > 0) {
        await tokenService.refundTokens(existing.companyId, existing.tokenCost, tx);
      }

      const result = await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'CANCELLED' },
        include: bookingWithDetails,
      });

      await tx.bookingLog.create({
        data: {
          bookingId,
          action: 'CANCELLED',
          actorId: requestUserId,
          metadata: { refunded: isRefundEligible, tokenCost: existing.tokenCost } as any,
        },
      });

      return result;
    });

    return updated;
  },

  async approveBooking(bookingId: string, adminId: string) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) throw new Error('Booking not found');
    if (booking.status !== 'PENDING_APPROVAL') throw new Error('Booking is not pending approval');

    const updated = await bookingRepository.update(bookingId, { status: 'ACTIVE' });

    await bookingRepository.addLog({
      bookingId,
      action: 'APPROVED',
      actorId: adminId,
    });

    const user = await userRepository.findById(booking.userId);
    if (user) {
      notificationService.sendApprovalNotification({
        userEmail: user.email,
        userName: user.name,
        bookingTitle: booking.title,
        approved: true,
      }).catch(console.error);
    }

    return updated;
  },

  async rejectBooking(bookingId: string, adminId: string, reason?: string) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) throw new Error('Booking not found');
    if (booking.status !== 'PENDING_APPROVAL') throw new Error('Booking is not pending approval');

    const updated = await prisma.$transaction(async (tx) => {
      // Admin rejection always refunds
      if (booking.tokenCost > 0) {
        await tokenService.refundTokens(booking.companyId, booking.tokenCost, tx);
      }

      const result = await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'REJECTED' },
        include: bookingWithDetails,
      });

      await tx.bookingLog.create({
        data: {
          bookingId,
          action: 'REJECTED',
          actorId: adminId,
          metadata: (reason ? { reason, tokenRefunded: booking.tokenCost } : { tokenRefunded: booking.tokenCost }) as any,
        },
      });

      return result;
    });

    const user = await userRepository.findById(booking.userId);
    if (user) {
      notificationService.sendApprovalNotification({
        userEmail: user.email,
        userName: user.name,
        bookingTitle: booking.title,
        approved: false,
        reason,
      }).catch(console.error);
    }

    return updated;
  },

  getPendingBookings() {
    return bookingRepository.findPending();
  },
};
