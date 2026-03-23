import { PrismaClient } from '@prisma/client';
import { bookingRepository } from '../repositories/booking.repository';
import { roomRepository } from '../repositories/room.repository';

const prisma = new PrismaClient();

const BUSINESS_HOURS_PER_DAY = 10; // 8am–6pm

function getDateRange(days = 30) {
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  return { from, to };
}

export const analyticsService = {
  async getUtilisation(days = 30, locationId?: string | null) {
    const { from, to } = getDateRange(days);

    const rooms = locationId
      ? await prisma.room.findMany({ where: { locationId, isActive: true }, orderBy: { name: 'asc' } })
      : await roomRepository.findAll();

    const stats = await prisma.booking.groupBy({
      by: ['roomId'],
      where: {
        startTime: { gte: from },
        endTime: { lte: to },
        status: { in: ['ACTIVE', 'COMPLETED'] },
        ...(locationId ? { locationId } : {}),
      },
      _sum: { durationHours: true },
    });

    const totalAvailableHoursPerRoom = days * BUSINESS_HOURS_PER_DAY;

    return rooms.map((room) => {
      const stat = stats.find((s) => s.roomId === room.id);
      const bookedHours = stat?._sum?.durationHours ?? 0;
      const utilisationPercent = Math.min(100, (bookedHours / totalAvailableHoursPerRoom) * 100);
      return {
        roomId: room.id,
        roomName: room.name,
        utilisationPercent: Math.round(utilisationPercent * 10) / 10,
        totalHours: totalAvailableHoursPerRoom,
        bookedHours: Math.round(bookedHours * 10) / 10,
      };
    });
  },

  async getCompanyHours(days = 30, locationId?: string | null) {
    const { from, to } = getDateRange(days);

    const stats = await prisma.booking.groupBy({
      by: ['companyId'],
      where: {
        startTime: { gte: from },
        endTime: { lte: to },
        status: { in: ['ACTIVE', 'COMPLETED'] },
        ...(locationId ? { locationId } : {}),
      },
      _sum: { durationHours: true },
      _count: true,
    });

    const companyIds = stats.map((s) => s.companyId);
    const companies = await prisma.company.findMany({
      where: { id: { in: companyIds } },
    });

    return stats.map((s) => {
      const company = companies.find((c) => c.id === s.companyId);
      return {
        companyId: s.companyId,
        companyName: company?.name ?? 'Unknown',
        color: company?.color ?? '#6B7280',
        totalHours: Math.round((s._sum?.durationHours ?? 0) * 10) / 10,
        bookingCount: s._count,
      };
    });
  },

  async getPeakTimes(days = 30, locationId?: string | null) {
    const { from, to } = getDateRange(days);

    const bookings = await prisma.booking.findMany({
      where: {
        startTime: { gte: from },
        endTime: { lte: to },
        status: { in: ['ACTIVE', 'COMPLETED'] },
        ...(locationId ? { locationId } : {}),
      },
      select: { startTime: true },
    });

    const matrix: Record<string, number> = {};
    for (const b of bookings) {
      const hour = b.startTime.getHours();
      const day = b.startTime.getDay();
      const key = `${hour}-${day}`;
      matrix[key] = (matrix[key] ?? 0) + 1;
    }

    return Object.entries(matrix).map(([key, count]) => {
      const [hour, day] = key.split('-').map(Number);
      return { hour, day, bookingCount: count };
    });
  },

  async getCancellations(days = 30, locationId?: string | null) {
    const { from, to } = getDateRange(days);
    const where = {
      createdAt: { gte: from, lte: to },
      ...(locationId ? { locationId } : {}),
    };

    const total = await prisma.booking.count({ where });
    const cancelled = await prisma.booking.count({ where: { ...where, status: 'CANCELLED' } });
    const noShow = await prisma.booking.count({ where: { ...where, status: 'NO_SHOW' } });

    return {
      totalBookings: total,
      cancelled,
      noShow,
      cancellationRate: total > 0 ? Math.round((cancelled / total) * 1000) / 10 : 0,
      noShowRate: total > 0 ? Math.round((noShow / total) * 1000) / 10 : 0,
    };
  },
};
