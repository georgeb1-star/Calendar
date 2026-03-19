import { PrismaClient, User, Role } from '@prisma/client';

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

  create(data: {
    email: string;
    passwordHash: string;
    name: string;
    companyId: string;
    role?: Role;
  }) {
    return prisma.user.create({
      data,
      include: { company: true },
    });
  },

  delete(id: string) {
    return prisma.user.delete({ where: { id } });
  },
};
