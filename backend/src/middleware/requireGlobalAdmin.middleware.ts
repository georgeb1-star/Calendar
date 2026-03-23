import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';

export function requireGlobalAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'GLOBAL_ADMIN') {
    res.status(403).json({ error: 'Global admin access required' });
    return;
  }
  next();
}
