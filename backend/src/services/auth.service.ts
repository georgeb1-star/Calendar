import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { userRepository } from '../repositories/user.repository';
import { notificationService } from './notification.service';

export const authService = {
  async login(email: string, password: string) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new Error('Invalid credentials');
    }

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

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: user.companyId,
        company: user.company,
      },
    };
  },

  async getMe(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) throw new Error('User not found');
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      companyId: user.companyId,
      company: user.company,
    };
  },

  async createUser(data: {
    email: string;
    password: string;
    name: string;
    companyId: string;
    role?: 'EMPLOYEE' | 'ADMIN';
  }) {
    const passwordHash = await bcrypt.hash(data.password, 10);
    return userRepository.create({
      email: data.email,
      passwordHash,
      name: data.name,
      companyId: data.companyId,
      role: data.role,
    });
  },

  async register(data: { name: string; email: string; password: string; companyId: string }) {
    const existing = await userRepository.findByEmail(data.email);
    if (existing) throw new Error('Email already in use');

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await userRepository.create({
      email: data.email,
      passwordHash,
      name: data.name,
      companyId: data.companyId,
      role: 'EMPLOYEE',
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

    notificationService
      .sendWelcomeEmail({ userEmail: user.email, userName: user.name })
      .catch(console.error);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: user.companyId,
        company: user.company,
      },
    };
  },
};
