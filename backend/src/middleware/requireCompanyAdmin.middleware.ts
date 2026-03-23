import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';

export function requireCompanyAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  const role = req.user?.role;
  if (!role || !['COMPANY_ADMIN', 'ADMIN', 'OFFICE_ADMIN', 'GLOBAL_ADMIN'].includes(role)) {
    res.status(403).json({ error: 'Company admin access required' });
    return;
  }
  next();
}
