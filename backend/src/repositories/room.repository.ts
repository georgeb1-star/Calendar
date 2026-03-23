import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const roomRepository = {
  findAll(activeOnly = true) {
    return prisma.room.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { name: 'asc' },
    });
  },

  findById(id: string) {
    return prisma.room.findUnique({ where: { id } });
  },

  create(data: { name: string; capacity: number; amenities?: string[]; locationId: string }) {
    return prisma.room.create({ data });
  },

  update(id: string, data: Partial<{ name: string; capacity: number; amenities: string[]; isActive: boolean }>) {
    return prisma.room.update({ where: { id }, data });
  },

  getBookingsForRoom(roomId: string, from: Date, to: Date) {
    return prisma.booking.findMany({
      where: {
        roomId,
        startTime: { gte: from },
        endTime: { lte: to },
        status: { notIn: ['CANCELLED', 'REJECTED', 'NO_SHOW'] },
      },
      orderBy: { startTime: 'asc' },
    });
  },
};
