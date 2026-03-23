import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';

export function requireOfficeAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  const role = req.user?.role;
  if (!role || !['ADMIN', 'OFFICE_ADMIN', 'GLOBAL_ADMIN'].includes(role)) {
    res.status(403).json({ error: 'Office admin access required' });
    return;
  }
  next();
}
