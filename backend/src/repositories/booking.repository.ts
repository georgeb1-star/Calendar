import { PrismaClient, BookingStatus } from '@prisma/client';

const prisma = new PrismaClient();

const bookingWithDetails = {
  room: true,
  user: { select: { id: true, name: true, email: true, companyId: true } },
  company: { select: { id: true, name: true, color: true } },
} as const;

export const bookingRepository = {
  findAll() {
    return prisma.booking.findMany({
      include: bookingWithDetails,
      orderBy: { startTime: 'asc' },
    });
  },

  findByUser(userId: string) {
    return prisma.booking.findMany({
      where: { userId },
      include: bookingWithDetails,
      orderBy: { startTime: 'desc' },
    });
  },

  findById(id: string) {
    return prisma.booking.findUnique({
      where: { id },
      include: { ...bookingWithDetails, logs: { orderBy: { timestamp: 'desc' } } },
    });
  },

  findPending() {
    return prisma.booking.findMany({
      where: { status: 'PENDING_APPROVAL' },
      include: bookingWithDetails,
      orderBy: { createdAt: 'asc' },
    });
  },

  create(data: {
    title: string;
    roomId: string;
    userId: string;
    companyId: string;
    startTime: Date;
    endTime: Date;
    durationHours: number;
    status: BookingStatus;
    notes?: string;
  }) {
    return prisma.booking.create({
      data,
      include: bookingWithDetails,
    });
  },

  update(id: string, data: Partial<{
    title: string;
    startTime: Date;
    endTime: Date;
    durationHours: number;
    status: BookingStatus;
    checkInTime: Date;
    isNoShow: boolean;
    notes: string;
  }>) {
    return prisma.booking.update({
      where: { id },
      data,
      include: bookingWithDetails,
    });
  },

  addLog(data: { bookingId: string; action: string; actorId: string; metadata?: Record<string, unknown> }) {
    return prisma.bookingLog.create({ data: data as any });
  },

  findOverlapping(roomId: string, startTime: Date, endTime: Date, excludeId?: string) {
    return prisma.booking.findFirst({
      where: {
        roomId,
        status: { notIn: ['CANCELLED', 'REJECTED', 'NO_SHOW'] },
        // Overlap condition: existing.start < newEnd AND existing.end > newStart
        startTime: { lt: endTime },
        endTime: { gt: startTime },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
  },

  findActiveBookingsPastCheckInWindow() {
    const cutoff = new Date(Date.now() - 15 * 60 * 1000); // 15 min ago
    return prisma.booking.findMany({
      where: {
        status: 'ACTIVE',
        checkInTime: null,
        startTime: { lt: cutoff },
        isNoShow: false,
      },
    });
  },

  // Analytics queries
  async getUtilisationStats(from: Date, to: Date) {
    return prisma.booking.groupBy({
      by: ['roomId'],
      where: {
        startTime: { gte: from },
        endTime: { lte: to },
        status: { in: ['ACTIVE', 'COMPLETED'] },
      },
      _sum: { durationHours: true },
    });
  },

  async getCompanyHours(from: Date, to: Date) {
    return prisma.booking.groupBy({
      by: ['companyId'],
      where: {
        startTime: { gte: from },
        endTime: { lte: to },
        status: { in: ['ACTIVE', 'COMPLETED'] },
      },
      _sum: { durationHours: true },
      _count: true,
    });
  },

  async getPeakTimes(from: Date, to: Date) {
    return prisma.booking.findMany({
      where: {
        startTime: { gte: from },
        endTime: { lte: to },
        status: { in: ['ACTIVE', 'COMPLETED'] },
      },
      select: { startTime: true },
    });
  },

  async getCancellationStats(from: Date, to: Date) {
    const total = await prisma.booking.count({ where: { createdAt: { gte: from, lte: to } } });
    const cancelled = await prisma.booking.count({ where: { createdAt: { gte: from, lte: to }, status: 'CANCELLED' } });
    const noShow = await prisma.booking.count({ where: { createdAt: { gte: from, lte: to }, status: 'NO_SHOW' } });
    return { total, cancelled, noShow };
  },
};
