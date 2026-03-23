import prisma from '../lib/prisma';
import { tokenService } from './token.service';

function calcTokenCost(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const mins = eh * 60 + em - (sh * 60 + sm);
  return Math.round((mins / 60) * 100) / 100;
}

function buildDatetime(dateStr: string, timeStr: string): Date {
  return new Date(`${dateStr}T${timeStr}:00`);
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Returns the next date (>= from) whose ISO weekday matches dayOfWeek (1=Mon, 7=Sun) */
function nextOccurrence(from: Date, dayOfWeek: number): Date {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  const currentDow = d.getDay() === 0 ? 7 : d.getDay();
  const diff = (dayOfWeek - currentDow + 7) % 7;
  d.setDate(d.getDate() + diff);
  return d;
}

export const recurringService = {
  async createSeries(data: {
    userId: string;
    companyId: string;
    locationId: string;
    roomId: string;
    title: string;
    notes?: string;
    dayOfWeek: number;
    startTime: string; // "HH:MM"
    endTime: string;   // "HH:MM"
    endDate: Date;
    role: 'EMPLOYEE' | 'ADMIN' | 'COMPANY_ADMIN' | 'OFFICE_ADMIN' | 'GLOBAL_ADMIN';
    locationName: string;
  }) {
    const tokenCost = calcTokenCost(data.startTime, data.endTime);
    const formattedTitle = `[${data.locationName}] ${data.title}`;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(data.endDate);
    endDate.setHours(23, 59, 59, 999);

    const dates: Date[] = [];
    let cursor = nextOccurrence(today, data.dayOfWeek);
    while (cursor <= endDate) {
      dates.push(new Date(cursor));
      cursor = new Date(cursor);
      cursor.setDate(cursor.getDate() + 7);
    }

    if (dates.length === 0) {
      throw new Error('No occurrences found for the selected day and end date');
    }

    const created: any[] = [];
    const skipped: Date[] = [];

    const series = await prisma.recurringBooking.create({
      data: {
        userId: data.userId,
        companyId: data.companyId,
        locationId: data.locationId,
        roomId: data.roomId,
        title: data.title,
        notes: data.notes,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
        endDate: data.endDate,
      },
    });

    for (const date of dates) {
      const dateStr = toDateStr(date);
      const startDt = buildDatetime(dateStr, data.startTime);
      const endDt = buildDatetime(dateStr, data.endTime);
      const isToday = toDateStr(date) === toDateStr(new Date());

      try {
        await prisma.$transaction(async (tx) => {
          const conflict = await tx.booking.findFirst({
            where: {
              roomId: data.roomId,
              status: { notIn: ['CANCELLED', 'REJECTED', 'NO_SHOW'] },
              startTime: { lt: endDt },
              endTime: { gt: startDt },
            },
          });

          if (conflict) {
            skipped.push(date);
            throw new Error('CONFLICT_SKIP');
          }

          let isPaid = false;
          if (isToday) {
            await tokenService.deductTokens(data.locationId, tokenCost, tx);
            isPaid = true;
          }

          const booking = await tx.booking.create({
            data: {
              title: formattedTitle,
              roomId: data.roomId,
              userId: data.userId,
              companyId: data.companyId,
              locationId: data.locationId,
              startTime: startDt,
              endTime: endDt,
              durationHours: tokenCost,
              status: 'ACTIVE',
              notes: data.notes,
              tokenCost,
              isPaid,
              recurringId: series.id,
            },
          });

          created.push(booking);
        });
      } catch (err: any) {
        if (err.message !== 'CONFLICT_SKIP') {
          console.error(`[Recurring] Failed to create booking for ${dateStr}:`, err);
          skipped.push(date);
        }
      }
    }

    return { series, created, skipped };
  },

  async cancelSeries(
    recurringId: string,
    userId: string,
    userRole: 'EMPLOYEE' | 'ADMIN' | 'COMPANY_ADMIN' | 'OFFICE_ADMIN' | 'GLOBAL_ADMIN'
  ) {
    const series = await prisma.recurringBooking.findUnique({
      where: { id: recurringId },
      include: { bookings: true },
    });

    if (!series) throw new Error('Recurring series not found');

    const isAdmin = ['ADMIN', 'OFFICE_ADMIN', 'GLOBAL_ADMIN'].includes(userRole);
    if (series.userId !== userId && !isAdmin) {
      throw new Error('Not authorized to cancel this series');
    }

    const now = new Date();
    const futureBookings = series.bookings.filter(
      (b) => ['ACTIVE', 'PENDING_APPROVAL'].includes(b.status) && b.startTime > now
    );

    const twoHoursMs = 2 * 60 * 60 * 1000;
    const cancelled: string[] = [];

    for (const booking of futureBookings) {
      const isRefundEligible = now <= new Date(booking.startTime.getTime() - twoHoursMs);

      await prisma.$transaction(async (tx) => {
        if (isRefundEligible && booking.isPaid && booking.tokenCost > 0) {
          await tokenService.refundTokens(booking.locationId, booking.tokenCost, tx);
        }

        await tx.booking.update({
          where: { id: booking.id },
          data: { status: 'CANCELLED' },
        });

        await tx.bookingLog.create({
          data: {
            bookingId: booking.id,
            action: 'CANCELLED',
            actorId: userId,
            metadata: { reason: 'series_cancelled', refunded: isRefundEligible && booking.isPaid } as any,
          },
        });
      });

      cancelled.push(booking.id);
    }

    await prisma.recurringBooking.delete({ where: { id: recurringId } });

    return { cancelled: cancelled.length };
  },

  async listSeriesByUser(userId: string) {
    return prisma.recurringBooking.findMany({
      where: { userId },
      include: { room: true },
      orderBy: { createdAt: 'desc' },
    });
  },
};
