import { Request } from 'express';

export interface AuthenticatedUser {
  userId: string;
  companyId: string;
  locationId: string | null; // null for GLOBAL_ADMIN
  role: 'EMPLOYEE' | 'ADMIN' | 'COMPANY_ADMIN' | 'OFFICE_ADMIN' | 'GLOBAL_ADMIN';
  email: string;
  name: string;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}
