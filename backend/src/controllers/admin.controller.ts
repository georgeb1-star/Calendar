import { Response } from 'express';
import { AuthRequest } from '../types';
import { authService } from '../services/auth.service';
import { userRepository } from '../repositories/user.repository';
import { bookingService } from '../services/booking.service';
import { analyticsService } from '../services/analytics.service';
import { tokenService } from '../services/token.service';
import prisma from '../lib/prisma';

export const adminController = {
  // User management
  async createUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { email, password, name, locationId, role } = req.body;
      if (!email || !password || !name || !locationId) {
        res.status(400).json({ error: 'email, password, name, and locationId are required' });
        return;
      }
      // OFFICE_ADMIN can only create users for their own location
      if (req.user!.role === 'OFFICE_ADMIN' && req.user!.locationId !== locationId) {
        res.status(403).json({ error: 'You can only create users for your own location' });
        return;
      }
      const user = await authService.createUser({ email, password, name, locationId, role });
      res.status(201).json(user);
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to create user' });
    }
  },

  async getUsers(req: AuthRequest, res: Response): Promise<void> {
    try {
      const locationId = req.user!.locationId;
      const users = locationId
        ? await userRepository.findByLocation(locationId)
        : await userRepository.findAll();
      res.json(users);
    } catch (err: unknown) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch users' });
    }
  },

  async deleteUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      // OFFICE_ADMIN can only delete users in their location
      if (req.user!.locationId) {
        const target = await userRepository.findById(req.params.id);
        if (!target || target.locationId !== req.user!.locationId) {
          res.status(403).json({ error: 'User not found in your location' });
          return;
        }
      }
      await userRepository.delete(req.params.id);
      res.json({ message: 'User deleted' });
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to delete user' });
    }
  },

  // Booking approvals
  async getPendingBookings(req: AuthRequest, res: Response): Promise<void> {
    try {
      const locationId = req.user!.locationId;
      const bookings = await bookingService.getPendingBookings(locationId);
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
      const locationId = req.user!.locationId;
      const data = await analyticsService.getUtilisation(days, locationId);
      res.json(data);
    } catch (err: unknown) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch utilisation' });
    }
  },

  async getCompanyHours(req: AuthRequest, res: Response): Promise<void> {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const locationId = req.user!.locationId;
      const data = await analyticsService.getCompanyHours(days, locationId);
      res.json(data);
    } catch (err: unknown) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch company hours' });
    }
  },

  async getPeakTimes(req: AuthRequest, res: Response): Promise<void> {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const locationId = req.user!.locationId;
      const data = await analyticsService.getPeakTimes(days, locationId);
      res.json(data);
    } catch (err: unknown) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch peak times' });
    }
  },

  async getCancellations(req: AuthRequest, res: Response): Promise<void> {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const locationId = req.user!.locationId;
      const data = await analyticsService.getCancellations(days, locationId);
      res.json(data);
    } catch (err: unknown) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch cancellation stats' });
    }
  },

  // Location token management (for OFFICE_ADMIN — own location only)
  async getLocationTokens(req: AuthRequest, res: Response): Promise<void> {
    try {
      const locationId = req.user!.locationId;
      if (!locationId) {
        res.status(400).json({ error: 'No location associated with your account' });
        return;
      }
      const today = new Date();
      const dateStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;

      const row = await prisma.locationDailyTokens.findUnique({
        where: { locationId_date: { locationId, date: dateStr } },
      });
      const tokensTotal = row?.tokensTotal ?? 3;
      const tokensUsed = row?.tokensUsed ?? 0;

      res.json({
        locationId,
        tokensTotal,
        tokensUsed,
        tokensRemaining: tokensTotal - tokensUsed,
      });
    } catch (err: unknown) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch tokens' });
    }
  },

  // Rooms list for the admin's location
  async getRooms(req: AuthRequest, res: Response): Promise<void> {
    try {
      const locationId = req.user!.locationId;
      if (!locationId) {
        res.status(400).json({ error: 'No location associated with your account' });
        return;
      }
      const rooms = await prisma.room.findMany({
        where: { locationId },
        orderBy: { name: 'asc' },
      });
      res.json(rooms);
    } catch (err: unknown) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch rooms' });
    }
  },
};
