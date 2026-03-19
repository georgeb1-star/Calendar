import { Request } from 'express';

export interface AuthenticatedUser {
  userId: string;
  companyId: string;
  role: 'EMPLOYEE' | 'ADMIN';
  email: string;
  name: string;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}
