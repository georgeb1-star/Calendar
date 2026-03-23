import { Response } from 'express';
import { AuthRequest } from '../types';
import { locationService } from '../services/location.service';
import { bookingService } from '../services/booking.service';
import { analyticsService } from '../services/analytics.service';
import { tokenService } from '../services/token.service';
import { userRepository } from '../repositories/user.repository';
import prisma from '../lib/prisma';

export const globalAdminController = {
  // GET /api/global-admin/locations
  async listLocations(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const locations = await locationService.getAllLocations();
      res.json(locations);
    } catch (err: unknown) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch locations' });
    }
  },

  // GET /api/global-admin/locations/:id/bookings
  async getLocationBookings(req: AuthRequest, res: Response): Promise<void> {
    try {
      const bookings = await bookingService.getAllBookings(req.params.id);
      res.json(bookings);
    } catch (err: unknown) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch bookings' });
    }
  },

  // GET /api/global-admin/locations/:id/users
  async getLocationUsers(req: AuthRequest, res: Response): Promise<void> {
    try {
      const users = await userRepository.findByLocation(req.params.id);
      res.json(users);
    } catch (err: unknown) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch users' });
    }
  },

  // GET /api/global-admin/locations/:id/rooms
  async getLocationRooms(req: AuthRequest, res: Response): Promise<void> {
    try {
      const rooms = await prisma.room.findMany({
        where: { locationId: req.params.id },
        orderBy: { name: 'asc' },
      });
      res.json(rooms);
    } catch (err: unknown) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch rooms' });
    }
  },

  // GET /api/global-admin/locations/:id/tokens
  async getLocationTokens(req: AuthRequest, res: Response): Promise<void> {
    try {
      const balance = await tokenService.getBalance(req.params.id);
      res.json(balance);
    } catch (err: unknown) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch token balance' });
    }
  },

  // PUT /api/global-admin/locations/:id/tokens
  async setLocationTokens(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { tokensTotal } = req.body;
      if (typeof tokensTotal !== 'number' || tokensTotal < 0) {
        res.status(400).json({ error: 'tokensTotal must be a non-negative number' });
        return;
      }

      const today = new Date();
      const dateStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
      const locationId = req.params.id;

      const row = await prisma.locationDailyTokens.upsert({
        where: { locationId_date: { locationId, date: dateStr } },
        create: { locationId, date: dateStr, tokensTotal, tokensUsed: 0 },
        update: { tokensTotal },
      });

      res.json({
        tokensTotal: row.tokensTotal,
        tokensUsed: row.tokensUsed,
        tokensRemaining: row.tokensTotal - row.tokensUsed,
      });
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update token allowance' });
    }
  },

  // GET /api/global-admin/analytics
  async getAnalytics(req: AuthRequest, res: Response): Promise<void> {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const [utilisation, companyHours, peakTimes, cancellations] = await Promise.all([
        analyticsService.getUtilisation(days, null),
        analyticsService.getCompanyHours(days, null),
        analyticsService.getPeakTimes(days, null),
        analyticsService.getCancellations(days, null),
      ]);
      res.json({ utilisation, companyHours, peakTimes, cancellations });
    } catch (err: unknown) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch analytics' });
    }
  },

  // GET /api/global-admin/locations/:id/pending
  async getLocationPendingBookings(req: AuthRequest, res: Response): Promise<void> {
    try {
      const bookings = await bookingService.getPendingBookings(req.params.id);
      res.json(bookings);
    } catch (err: unknown) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch pending bookings' });
    }
  },
};
