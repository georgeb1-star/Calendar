import bcrypt from 'bcryptjs';
import crypto from 'crypto';
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
    emailReminders: user.emailReminders ?? true,
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

  async updateMe(userId: string, data: { emailReminders: boolean }) {
    const user = await prisma.user.update({
      where: { id: userId },
      data,
      include: { company: true, location: true },
    });
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

  async register(data: { name: string; email: string; password: string; locationId: string; companyId: string }) {
    const existing = await userRepository.findByEmail(data.email);
    if (existing) throw new Error('Email already in use');

    const location = await prisma.location.findUnique({
      where: { id: data.locationId },
      include: { company: true },
    });
    if (!location) throw new Error('Location not found');

    const company = await prisma.company.findUnique({ where: { id: data.companyId } });
    if (!company) throw new Error('Company not found');

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await userRepository.create({
      email: data.email,
      passwordHash,
      name: data.name,
      companyId: data.companyId,
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

  async requestPasswordReset(email: string) {
    // Always return success to avoid email enumeration
    const user = await userRepository.findByEmail(email);
    if (!user) return;

    // Invalidate any existing tokens for this user
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;
    await notificationService.sendPasswordResetEmail({ userEmail: user.email, userName: user.name, resetUrl });
  },

  async resetPassword(rawToken: string, newPassword: string) {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!record || record.expiresAt < new Date()) {
      throw new Error('Reset link is invalid or has expired. Please request a new one.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: record.userId }, data: { passwordHash } });
    await prisma.passwordResetToken.delete({ where: { id: record.id } });
  },

  async getLocations() {
    return prisma.location.findMany({
      where: { isActive: true },
      select: { id: true, name: true, address: true },
      orderBy: { name: 'asc' },
    });
  },

  async getCompanies() {
    return prisma.company.findMany({
      where: { name: { not: 'Nammu Workplace' } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  },
};
