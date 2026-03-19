import { Response } from 'express';
import { AuthRequest } from '../types';
import { authService } from '../services/auth.service';
import { userRepository } from '../repositories/user.repository';
import { bookingService } from '../services/booking.service';
import { analyticsService } from '../services/analytics.service';

export const adminController = {
  // User management
  async createUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { email, password, name, companyId, role } = req.body;
      if (!email || !password || !name || !companyId) {
        res.status(400).json({ error: 'email, password, name, and companyId are required' });
        return;
      }
      const user = await authService.createUser({ email, password, name, companyId, role });
      res.status(201).json(user);
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to create user' });
    }
  },

  async getUsers(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const users = await userRepository.findAll();
      res.json(users);
    } catch (err: unknown) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch users' });
    }
  },

  async deleteUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      await userRepository.delete(req.params.id);
      res.json({ message: 'User deleted' });
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to delete user' });
    }
  },

  // Booking approvals
  async getPendingBookings(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const bookings = await bookingService.getPendingBookings();
      res.json(bookings);
    } catch (err: unknown) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch pending bookings' });
    }
  },

  async approveBooking(req: AuthRequest, res: Response): Promise<void> {
    try {
      const booking = await bookingService.approveBooking(req.params.id, req.user!.userId);
      res.json(booking);
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to approve booking' });
    }
  },

  async rejectBooking(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { reason } = req.body;
      const booking = await bookingService.rejectBooking(req.params.id, req.user!.userId, reason);
      res.json(booking);
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to reject booking' });
    }
  },

  // Analytics
  async getUtilisation(req: AuthRequest, res: Response): Promise<void> {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const data = await analyticsService.getUtilisation(days);
      res.json(data);
    } catch (err: unknown) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch utilisation' });
    }
  },

  async getCompanyHours(req: AuthRequest, res: Response): Promise<void> {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const data = await analyticsService.getCompanyHours(days);
      res.json(data);
    } catch (err: unknown) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch company hours' });
    }
  },

  async getPeakTimes(req: AuthRequest, res: Response): Promise<void> {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const data = await analyticsService.getPeakTimes(days);
      res.json(data);
    } catch (err: unknown) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch peak times' });
    }
  },

  async getCancellations(req: AuthRequest, res: Response): Promise<void> {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const data = await analyticsService.getCancellations(days);
      res.json(data);
    } catch (err: unknown) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch cancellation stats' });
    }
  },
};
