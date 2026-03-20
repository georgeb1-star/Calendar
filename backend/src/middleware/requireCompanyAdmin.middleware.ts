import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';

export function requireCompanyAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user || (req.user.role !== 'COMPANY_ADMIN' && req.user.role !== 'ADMIN')) {
    res.status(403).json({ error: 'Company admin access required' });
    return;
  }
  next();
}
