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

  async register(req: Request, res: Response): Promise<void> {
    try {
      const { name, email, password, locationId, companyId } = req.body;
      if (!name || !email || !password || !locationId || !companyId) {
        res.status(400).json({ error: 'Name, email, password, location, and company are required' });
        return;
      }
      const result = await authService.register({ name, email, password, locationId, companyId });
      res.status(201).json(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      const status = msg === 'Email already in use' ? 409 : 400;
      res.status(status).json({ error: msg });
    }
  },

  async getLocations(_req: Request, res: Response): Promise<void> {
    try {
      const locations = await authService.getLocations();
      res.json(locations);
    } catch (err: unknown) {
      res.status(500).json({ error: 'Failed to fetch locations' });
    }
  },

  async getCompanies(_req: Request, res: Response): Promise<void> {
    try {
      const companies = await authService.getCompanies();
      res.json(companies);
    } catch (err: unknown) {
      res.status(500).json({ error: 'Failed to fetch companies' });
    }
  },

  async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;
      if (!email) { res.status(400).json({ error: 'Email is required' }); return; }
      await authService.requestPasswordReset(email);
      // Always 200 — don't reveal whether the email exists
      res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
    } catch {
      res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
    }
  },

  async updateMe(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { emailReminders } = req.body;
      if (typeof emailReminders !== 'boolean') {
        res.status(400).json({ error: 'emailReminders must be a boolean' });
        return;
      }
      const updated = await authService.updateMe(req.user!.userId, { emailReminders });
      res.json(updated);
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update settings' });
    }
  },

  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, password } = req.body;
      if (!token || !password) { res.status(400).json({ error: 'Token and password are required' }); return; }
      if (password.length < 8) { res.status(400).json({ error: 'Password must be at least 8 characters' }); return; }
      await authService.resetPassword(token, password);
      res.json({ message: 'Password updated successfully. You can now log in.' });
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to reset password' });
    }
  },
};
