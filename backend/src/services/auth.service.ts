import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { userRepository } from '../repositories/user.repository';
import { notificationService } from './notification.service';
import prisma from '../lib/prisma';

function formatUser(user: any) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    companyId: user.companyId,
    company: user.company,
    locationId: user.locationId ?? null,
    location: user.location ?? null,
  };
}

function buildJwtPayload(user: any) {
  return {
    userId: user.id,
    companyId: user.companyId,
    locationId: user.locationId ?? null,
    role: user.role,
    email: user.email,
    name: user.name,
  };
}

export const authService = {
  async login(email: string, password: string) {
    const user = await userRepository.findByEmail(email);
    if (!user) throw new Error('Invalid credentials');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new Error('Invalid credentials');

    const token = jwt.sign(buildJwtPayload(user), process.env.JWT_SECRET || 'secret', {
      expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any,
    });

    return { token, user: formatUser(user) };
  },

  async getMe(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) throw new Error('User not found');
    return formatUser(user);
  },

  async createUser(data: {
    email: string;
    password: string;
    name: string;
    locationId: string;
    role?: 'EMPLOYEE' | 'COMPANY_ADMIN' | 'OFFICE_ADMIN' | 'GLOBAL_ADMIN';
  }) {
    const location = await prisma.location.findUnique({
      where: { id: data.locationId },
      select: { companyId: true },
    });
    if (!location) throw new Error('Location not found');

    const passwordHash = await bcrypt.hash(data.password, 10);
    return userRepository.create({
      email: data.email,
      passwordHash,
      name: data.name,
      companyId: location.companyId,
      locationId: data.locationId,
      role: data.role as any,
      status: 'ACTIVE',
    });
  },

  async register(data: { name: string; email: string; password: string; locationId: string }) {
    const existing = await userRepository.findByEmail(data.email);
    if (existing) throw new Error('Email already in use');

    const location = await prisma.location.findUnique({
      where: { id: data.locationId },
      include: { company: true },
    });
    if (!location) throw new Error('Location not found');

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await userRepository.create({
      email: data.email,
      passwordHash,
      name: data.name,
      companyId: location.companyId,
      locationId: data.locationId,
      role: 'EMPLOYEE',
      status: 'PENDING',
    });

    const token = jwt.sign(buildJwtPayload(user), process.env.JWT_SECRET || 'secret', {
      expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any,
    });

    // Notify OFFICE_ADMIN of this location (if one exists)
    const officeAdmin = await prisma.user.findFirst({
      where: { locationId: data.locationId, role: 'OFFICE_ADMIN' },
    });
    if (officeAdmin) {
      notificationService.sendPendingApprovalRequest({
        adminEmail: officeAdmin.email,
        adminName: officeAdmin.name,
        userName: user.name,
        userEmail: user.email,
        companyName: location.name,
      }).catch(console.error);
    }

    notificationService
      .sendWelcomeEmail({ userEmail: user.email, userName: user.name })
      .catch(console.error);

    return { token, user: formatUser(user) };
  },

  async getLocations() {
    return prisma.location.findMany({
      where: { isActive: true },
      select: { id: true, name: true, address: true },
      orderBy: { name: 'asc' },
    });
  },
};
