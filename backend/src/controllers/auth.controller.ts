import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { AuthRequest } from '../types';

export const authController = {
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
      }
      const result = await authService.login(email, password);
      res.json(result);
    } catch (err: unknown) {
      res.status(401).json({ error: err instanceof Error ? err.message : 'Login failed' });
    }
  },

  async me(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = await authService.getMe(req.user!.userId);
      res.json(user);
    } catch (err: unknown) {
      res.status(404).json({ error: err instanceof Error ? err.message : 'User not found' });
    }
  },

  logout(_req: Request, res: Response): void {
    res.json({ message: 'Logged out' });
  },
};
