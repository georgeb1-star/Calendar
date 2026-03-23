import prisma from '../lib/prisma';

export const locationService = {
  async getAllLocations() {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;

    const locations = await prisma.location.findMany({
      include: {
        _count: { select: { users: true, rooms: true } },
        dailyTokens: { where: { date: dateStr } },
      },
      orderBy: { name: 'asc' },
    });

    return locations.map((loc) => {
      const tokenRow = loc.dailyTokens[0];
      return {
        id: loc.id,
        name: loc.name,
        address: loc.address,
        color: loc.color,
        isActive: loc.isActive,
        companyId: loc.companyId,
        userCount: loc._count.users,
        roomCount: loc._count.rooms,
        tokensTotal: tokenRow?.tokensTotal ?? 3,
        tokensUsed: tokenRow?.tokensUsed ?? 0,
        tokensRemaining: (tokenRow?.tokensTotal ?? 3) - (tokenRow?.tokensUsed ?? 0),
        createdAt: loc.createdAt,
      };
    });
  },

  async getLocationById(id: string) {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;

    const loc = await prisma.location.findUnique({
      where: { id },
      include: {
        _count: { select: { users: true, rooms: true, bookings: true } },
        dailyTokens: { where: { date: dateStr } },
      },
    });

    if (!loc) return null;

    const tokenRow = loc.dailyTokens[0];
    return {
      id: loc.id,
      name: loc.name,
      address: loc.address,
      color: loc.color,
      isActive: loc.isActive,
      companyId: loc.companyId,
      userCount: loc._count.users,
      roomCount: loc._count.rooms,
      bookingCount: loc._count.bookings,
      tokensTotal: tokenRow?.tokensTotal ?? 3,
      tokensUsed: tokenRow?.tokensUsed ?? 0,
      tokensRemaining: (tokenRow?.tokensTotal ?? 3) - (tokenRow?.tokensUsed ?? 0),
      createdAt: loc.createdAt,
    };
  },

  async createLocation(data: { name: string; address?: string; color?: string; companyId: string }) {
    return prisma.location.create({
      data: {
        name: data.name,
        address: data.address,
        color: data.color ?? '#3B82F6',
        companyId: data.companyId,
      },
    });
  },

  async updateLocation(id: string, data: { name?: string; address?: string; color?: string; isActive?: boolean }) {
    return prisma.location.update({
      where: { id },
      data,
    });
  },

  async deactivateLocation(id: string) {
    return prisma.location.update({
      where: { id },
      data: { isActive: false },
    });
  },
};
