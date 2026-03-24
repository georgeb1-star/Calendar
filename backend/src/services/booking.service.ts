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
  location: { select: { id: true, name: true } },
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

const isAdminRole = (role: string) =>
  ['ADMIN', 'OFFICE_ADMIN', 'GLOBAL_ADMIN'].includes(role);

export const bookingService = {
  async getAllBookings(locationId?: string | null) {
    if (locationId) {
      return prisma.booking.findMany({
        where: { locationId },
        include: bookingWithDetails,
        orderBy: { startTime: 'asc' },
      });
    }
    return bookingRepository.findAll();
  },

  async getUserBookings(userId: string) {
    return bookingRepository.findByUser(userId);
  },

  async checkInviteeConflicts(inviteeIds: string[], startTime: Date, endTime: Date, excludeBookingId?: string) {
    if (inviteeIds.length === 0) return [];

    const cancelledStatuses: ('CANCELLED' | 'REJECTED' | 'NO_SHOW')[] = ['CANCELLED', 'REJECTED', 'NO_SHOW'];

    const organizerBookings = await prisma.booking.findMany({
      where: {
        userId: { in: inviteeIds },
        status: { notIn: cancelledStatuses },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
        ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        room: { select: { name: true } },
      },
    });

    const inviteBookings = await prisma.bookingInvite.findMany({
      where: {
        userId: { in: inviteeIds },
        booking: {
          status: { notIn: cancelledStatuses },
          startTime: { lt: endTime },
          endTime: { gt: startTime },
          ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
        },
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        booking: {
          include: { room: { select: { name: true } } },
        },
      },
    });

    const conflictMap = new Map<string, { userId: string; name: string; email: string; bookingTitle: string; roomName: string; startTime: Date; endTime: Date }>();

    for (const b of organizerBookings) {
      if (!conflictMap.has(b.userId)) {
        conflictMap.set(b.userId, { userId: b.userId, name: b.user.name, email: b.user.email, bookingTitle: b.title, roomName: b.room.name, startTime: b.startTime, endTime: b.endTime });
      }
    }
    for (const inv of inviteBookings) {
      if (!conflictMap.has(inv.userId)) {
        conflictMap.set(inv.userId, { userId: inv.userId, name: inv.user.name, email: inv.user.email, bookingTitle: inv.booking.title, roomName: inv.booking.room.name, startTime: inv.booking.startTime, endTime: inv.booking.endTime });
      }
    }

    return Array.from(conflictMap.values());
  },

  async createBooking(data: {
    title: string;
    roomId: string;
    startTime: string;
    endTime: string;
    notes?: string;
    userId: string;
    companyId: string;
    role: 'EMPLOYEE' | 'ADMIN' | 'COMPANY_ADMIN' | 'OFFICE_ADMIN' | 'GLOBAL_ADMIN';
    inviteeIds?: string[];
  }) {
    const user = await userRepository.findById(data.userId);
    if (!user) throw new Error('User not found');
    if (user.status === 'PENDING') {
      throw new Error('Your account is pending approval. You cannot make bookings until a company admin approves your account.');
    }

    const startTime = new Date(data.startTime);
    const endTime = new Date(data.endTime);

    if (!isSameDay(startTime, endTime)) {
      throw new Error('Booking must start and end on the same calendar day');
    }

    // Check blackout date for the room's location
    const bookingDateStr = `${startTime.getFullYear()}-${(startTime.getMonth() + 1).toString().padStart(2, '0')}-${startTime.getDate().toString().padStart(2, '0')}`;
    const room = await prisma.room.findUnique({ where: { id: data.roomId }, select: { locationId: true } });
    if (room) {
      const blackout = await prisma.blackoutDate.findUnique({
        where: { locationId_date: { locationId: room.locationId, date: bookingDateStr } },
      });
      if (blackout) {
        throw new Error(`This office is closed on ${bookingDateStr}${blackout.reason ? ` (${blackout.reason})` : ''}. Please choose a different date.`);
      }
      const roomClosure = await prisma.roomClosure.findUnique({
        where: { roomId_date: { roomId: data.roomId, date: bookingDateStr } },
      });
      if (roomClosure) {
        throw new Error(`This room is unavailable on ${bookingDateStr}${roomClosure.reason ? ` (${roomClosure.reason})` : ''}. Please choose a different date or room.`);
      }
    }

    const tokenCost = calcTokenCost(startTime, endTime);

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

      // Get room info (capacity + locationId)
      const room = await tx.room.findUnique({
        where: { id: data.roomId },
        select: {
          capacity: true,
          name: true,
          locationId: true,
          location: { select: { name: true } },
        },
      });
      if (!room) throw new Error('Room not found');

      const attendeeCount = 1 + (data.inviteeIds?.length ?? 0);
      if (attendeeCount > room.capacity) {
        throw new Error(`This room fits ${room.capacity} people. You have ${attendeeCount} attendees (including yourself).`);
      }

      const { status: rulesStatus, durationHours, formattedTitle } = bookingRulesService.validate({
        startTime,
        endTime,
        role: data.role,
        locationName: room.location.name,
        title: data.title,
      });

      // Check token balance — if insufficient, route to admin approval instead of blocking
      const todayRow = await tokenService.getTodayRow(room.locationId, tx);
      const remaining = todayRow.tokensTotal - todayRow.tokensUsed;
      const tokensPending = remaining < tokenCost;
      const status = tokensPending ? 'PENDING_APPROVAL' : rulesStatus;

      if (!tokensPending) {
        await tokenService.deductTokens(room.locationId, tokenCost, tx);
      }

      // Create booking
      const created = await tx.booking.create({
        data: {
          title: formattedTitle,
          roomId: data.roomId,
          userId: data.userId,
          companyId: data.companyId,
          locationId: room.locationId,
          startTime,
          endTime,
          durationHours,
          status,
          notes: data.notes,
          tokenCost,
          tokensPending,
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

    // Handle invitees
    let inviteeNames: string[] = [];
    if (data.inviteeIds && data.inviteeIds.length > 0) {
      const invitees = await prisma.user.findMany({
        where: {
          id: { in: data.inviteeIds },
          companyId: data.companyId,
          status: 'ACTIVE',
          NOT: { id: data.userId },
        },
      });

      if (invitees.length > 0) {
        await prisma.bookingInvite.createMany({
          data: invitees.map((inv) => ({ bookingId: booking.id, userId: inv.id })),
          skipDuplicates: true,
        });

        inviteeNames = invitees.map((inv) => inv.name);

        for (const invitee of invitees) {
          notificationService.sendBookingConfirmation({
            userEmail: invitee.email,
            userName: invitee.name,
            bookingTitle: booking.title,
            roomName: booking.room.name,
            startTime,
            endTime,
            status: booking.status,
          }).catch(console.error);
        }
      }
    }

    notificationService.sendBookingConfirmation({
      userEmail: user.email,
      userName: user.name,
      bookingTitle: booking.title,
      roomName: booking.room.name,
      startTime,
      endTime,
      status: booking.status,
      inviteeNames: inviteeNames.length > 0 ? inviteeNames : undefined,
    }).catch(console.error);

    return booking;
  },

  async updateBooking(bookingId: string, data: {
    title?: string;
    startTime?: string;
    endTime?: string;
    notes?: string;
    inviteeIds?: string[];
    requestUserId: string;
    requestUserRole: 'EMPLOYEE' | 'ADMIN' | 'COMPANY_ADMIN' | 'OFFICE_ADMIN' | 'GLOBAL_ADMIN';
    requestCompanyId: string;
  }) {
    const existing = await bookingRepository.findById(bookingId);
    if (!existing) throw new Error('Booking not found');

    if (existing.userId !== data.requestUserId && !isAdminRole(data.requestUserRole)) {
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

      // Check room capacity
      const room = await tx.room.findUnique({
        where: { id: existing.roomId },
        select: { capacity: true, name: true, location: { select: { name: true } } },
      });
      if (room) {
        const existingInviteeCount = await tx.bookingInvite.count({ where: { bookingId } });
        const newInviteeCount = data.inviteeIds?.length ?? 0;
        const attendeeCount = 1 + existingInviteeCount + newInviteeCount;
        if (attendeeCount > room.capacity) {
          throw new Error(`This room fits ${room.capacity} people. You have ${attendeeCount} attendees (including yourself).`);
        }
      }

      const locationName = room?.location?.name ?? '';
      const { status, durationHours, formattedTitle } = bookingRulesService.validate({
        startTime,
        endTime,
        role: data.requestUserRole,
        locationName,
        title: rawTitle,
      });

      await tokenService.adjustTokens(existing.locationId, existing.tokenCost, newTokenCost, tx);

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

  async cancelBooking(
    bookingId: string,
    requestUserId: string,
    requestUserRole: 'EMPLOYEE' | 'ADMIN' | 'COMPANY_ADMIN' | 'OFFICE_ADMIN' | 'GLOBAL_ADMIN'
  ) {
    const existing = await bookingRepository.findById(bookingId);
    if (!existing) throw new Error('Booking not found');

    if (existing.userId !== requestUserId && !isAdminRole(requestUserRole)) {
      throw new Error('Not authorized to cancel this booking');
    }

    if (['CANCELLED', 'REJECTED', 'NO_SHOW', 'COMPLETED'].includes(existing.status)) {
      throw new Error('Booking is already closed');
    }

    const now = new Date();
    const twoHoursBefore = new Date(existing.startTime.getTime() - 2 * 60 * 60 * 1000);
    const isRefundEligible = now <= twoHoursBefore;

    const updated = await prisma.$transaction(async (tx) => {
      if (isRefundEligible && existing.tokenCost > 0) {
        await tokenService.refundTokens(existing.locationId, existing.tokenCost, tx);
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

    const updated = await prisma.$transaction(async (tx) => {
      // If tokens weren't deducted at creation (over-limit booking), deduct now (capped at 0)
      if ((booking as any).tokensPending && booking.tokenCost > 0) {
        await tokenService.deductTokensCapped(booking.locationId, booking.tokenCost, tx);
      }

      const result = await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'ACTIVE', tokensPending: false },
        include: bookingWithDetails,
      });

      await tx.bookingLog.create({
        data: { bookingId, action: 'APPROVED', actorId: adminId },
      });

      return result;
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
      // Only refund if tokens were actually deducted at creation
      if (booking.tokenCost > 0 && !(booking as any).tokensPending) {
        await tokenService.refundTokens(booking.locationId, booking.tokenCost, tx);
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

  getPendingBookings(locationId?: string | null) {
    if (locationId) {
      return prisma.booking.findMany({
        where: { status: 'PENDING_APPROVAL', locationId },
        include: bookingWithDetails,
        orderBy: { createdAt: 'asc' },
      });
    }
    return bookingRepository.findPending();
  },

  async getInvitedBookings(userId: string) {
    const bookings = await prisma.booking.findMany({
      where: {
        invites: { some: { userId } },
        status: { notIn: ['CANCELLED', 'REJECTED', 'NO_SHOW'] },
      },
      include: {
        room: true,
        user: { select: { id: true, name: true, email: true, companyId: true } },
        company: { select: { id: true, name: true, color: true } },
        location: { select: { id: true, name: true } },
        invites: { where: { userId }, select: { id: true, status: true } },
      },
      orderBy: { startTime: 'asc' },
    });
    // Flatten invite id/status onto the booking object for convenience
    return bookings.map(b => ({
      ...b,
      inviteId: b.invites[0]?.id ?? null,
      inviteStatus: b.invites[0]?.status ?? 'PENDING',
    }));
  },

  async respondToInvite(inviteId: string, userId: string, status: 'ACCEPTED' | 'DECLINED') {
    const invite = await prisma.bookingInvite.findUnique({ where: { id: inviteId } });
    if (!invite) throw new Error('Invite not found');
    if (invite.userId !== userId) throw new Error('Not authorised');
    return prisma.bookingInvite.update({
      where: { id: inviteId },
      data: { status },
    });
  },

  async getColleagues(userId: string, locationId: string | null, companyId: string) {
    if (!locationId) return [];
    return prisma.user.findMany({
      where: {
        locationId,
        companyId,
        status: 'ACTIVE',
        NOT: { id: userId },
      },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    });
  },
};
