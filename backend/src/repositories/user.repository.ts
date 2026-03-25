import { PrismaClient, Role, UserStatus } from '@prisma/client';

const prisma = new PrismaClient();

const userInclude = {
  company: true,
  location: true,
} as const;

export const userRepository = {
  findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      include: userInclude,
    });
  },

  findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: userInclude,
    });
  },

  findAll() {
    return prisma.user.findMany({
      include: userInclude,
      orderBy: { createdAt: 'desc' },
    });
  },

  findByCompany(companyId: string) {
    return prisma.user.findMany({
      where: { companyId },
      include: userInclude,
      orderBy: { createdAt: 'desc' },
    });
  },

  findByLocation(locationId: string) {
    return prisma.user.findMany({
      where: { locationId },
      include: userInclude,
      orderBy: { createdAt: 'desc' },
    });
  },

  findPendingByCompany(companyId: string) {
    return prisma.user.findMany({
      where: { companyId, status: 'PENDING' },
      include: userInclude,
      orderBy: { createdAt: 'desc' },
    });
  },

  findPendingByLocation(locationId: string) {
    return prisma.user.findMany({
      where: { locationId, status: 'PENDING' },
      include: userInclude,
      orderBy: { createdAt: 'desc' },
    });
  },

  create(data: {
    email: string;
    passwordHash: string;
    name: string;
    companyId: string;
    locationId?: string | null;
    role?: Role;
    status?: UserStatus;
  }) {
    return prisma.user.create({
      data,
      include: userInclude,
    });
  },

  updateStatus(id: string, status: UserStatus) {
    return prisma.user.update({
      where: { id },
      data: { status },
      include: userInclude,
    });
  },

  updateRole(id: string, role: Role) {
    return prisma.user.update({
      where: { id },
      data: { role },
      include: userInclude,
    });
  },

  async delete(id: string) {
    const bookings = await prisma.booking.findMany({ where: { userId: id }, select: { id: true } });
    const bookingIds = bookings.map(b => b.id);
    if (bookingIds.length) {
      await prisma.bookingLog.deleteMany({ where: { bookingId: { in: bookingIds } } });
      await prisma.bookingInvite.deleteMany({ where: { bookingId: { in: bookingIds } } });
      await prisma.booking.deleteMany({ where: { userId: id } });
    }
    await prisma.bookingInvite.deleteMany({ where: { userId: id } });
    await prisma.recurringBooking.deleteMany({ where: { userId: id } });
    return prisma.user.delete({ where: { id } });
  },
};
