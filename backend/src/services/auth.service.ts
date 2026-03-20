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
  };
}

export const authService = {
  async login(email: string, password: string) {
    const user = await userRepository.findByEmail(email);
    if (!user) throw new Error('Invalid credentials');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new Error('Invalid credentials');

    const payload = {
      userId: user.id,
      companyId: user.companyId,
      role: user.role,
      email: user.email,
      name: user.name,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET || 'secret', {
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
    companyId: string;
    role?: 'EMPLOYEE' | 'ADMIN' | 'COMPANY_ADMIN';
  }) {
    const passwordHash = await bcrypt.hash(data.password, 10);
    // Admin-created users are immediately ACTIVE
    return userRepository.create({
      email: data.email,
      passwordHash,
      name: data.name,
      companyId: data.companyId,
      role: data.role,
      status: 'ACTIVE',
    });
  },

  async register(data: { name: string; email: string; password: string; companyId: string }) {
    const existing = await userRepository.findByEmail(data.email);
    if (existing) throw new Error('Email already in use');

    const passwordHash = await bcrypt.hash(data.password, 10);
    // Self-registered users start as PENDING
    const user = await userRepository.create({
      email: data.email,
      passwordHash,
      name: data.name,
      companyId: data.companyId,
      role: 'EMPLOYEE',
      status: 'PENDING',
    });

    const payload = {
      userId: user.id,
      companyId: user.companyId,
      role: user.role,
      email: user.email,
      name: user.name,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET || 'secret', {
      expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any,
    });

    // Notify COMPANY_ADMIN of the company (if one exists)
    const companyAdmin = await prisma.user.findFirst({
      where: { companyId: data.companyId, role: 'COMPANY_ADMIN' },
    });
    if (companyAdmin) {
      notificationService.sendPendingApprovalRequest({
        adminEmail: companyAdmin.email,
        adminName: companyAdmin.name,
        userName: user.name,
        userEmail: user.email,
        companyName: user.company.name,
      }).catch(console.error);
    }

    notificationService
      .sendWelcomeEmail({ userEmail: user.email, userName: user.name })
      .catch(console.error);

    return { token, user: formatUser(user) };
  },
};
