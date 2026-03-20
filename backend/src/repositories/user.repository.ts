import { PrismaClient, Role, UserStatus } from '@prisma/client';

const prisma = new PrismaClient();

export const userRepository = {
  findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      include: { company: true },
    });
  },

  findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: { company: true },
    });
  },

  findAll() {
    return prisma.user.findMany({
      include: { company: true },
      orderBy: { createdAt: 'desc' },
    });
  },

  findByCompany(companyId: string) {
    return prisma.user.findMany({
      where: { companyId },
      include: { company: true },
      orderBy: { createdAt: 'desc' },
    });
  },

  findPendingByCompany(companyId: string) {
    return prisma.user.findMany({
      where: { companyId, status: 'PENDING' },
      include: { company: true },
      orderBy: { createdAt: 'desc' },
    });
  },

  create(data: {
    email: string;
    passwordHash: string;
    name: string;
    companyId: string;
    role?: Role;
    status?: UserStatus;
  }) {
    return prisma.user.create({
      data,
      include: { company: true },
    });
  },

  updateStatus(id: string, status: UserStatus) {
    return prisma.user.update({
      where: { id },
      data: { status },
      include: { company: true },
    });
  },

  delete(id: string) {
    return prisma.user.delete({ where: { id } });
  },
};
