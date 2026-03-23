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

  delete(id: string) {
    return prisma.user.delete({ where: { id } });
  },
};
