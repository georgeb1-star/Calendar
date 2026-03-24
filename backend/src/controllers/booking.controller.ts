import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../types';
import { bookingService } from '../services/booking.service';
import { checkinService } from '../services/checkin.service';
import { tokenService } from '../services/token.service';
import { recurringService } from '../services/recurring.service';

export const bookingController = {
  async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const locationId = req.user!.locationId;
      const bookings = await bookingService.getAllBookings(locationId);
      res.json(bookings);
    } catch (err: unknown) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch bookings' });
    }
  },

  async getMine(req: AuthRequest, res: Response): Promise<void> {
    try {
      const bookings = await bookingService.getUserBookings(req.user!.userId);
      res.json(bookings);
    } catch (err: unknown) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch bookings' });
    }
  },

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { title, roomId, startTime, endTime, notes, inviteeIds } = req.body;
      if (!title || !roomId || !startTime || !endTime) {
        res.status(400).json({ error: 'title, roomId, startTime, and endTime are required' });
        return;
      }

      const booking = await bookingService.createBooking({
        title,
        roomId,
        startTime,
        endTime,
        notes,
        inviteeIds,
        userId: req.user!.userId,
        companyId: req.user!.companyId,
        role: req.user!.role,
      });

      res.status(201).json(booking);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create booking';
      if (message.includes('pending approval')) {
        res.status(403).json({ error: message });
        return;
      }
      if (message.includes('already booked') || message.includes('P2002') || message.includes('no_overlap') || message.includes('exclusion')) {
        res.status(409).json({ error: message });
        return;
      }
      res.status(400).json({ error: message });
    }
  },

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const booking = await bookingService.updateBooking(req.params.id, {
        ...req.body,
        requestUserId: req.user!.userId,
        requestUserRole: req.user!.role,
        requestCompanyId: req.user!.companyId,
      });
      res.json(booking);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update booking';
      if (message.includes('Not authorized')) {
        res.status(403).json({ error: message });
        return;
      }
      if (message.includes('already booked')) {
        res.status(409).json({ error: message });
        return;
      }
      if (message.includes('not found') || message.includes('Not found')) {
        res.status(404).json({ error: message });
        return;
      }
      res.status(400).json({ error: message });
    }
  },

  async cancel(req: AuthRequest, res: Response): Promise<void> {
    try {
      const booking = await bookingService.cancelBooking(
        req.params.id,
        req.user!.userId,
        req.user!.role
      );
      res.json(booking);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to cancel booking';
      if (message.includes('Not authorized')) {
        res.status(403).json({ error: message });
        return;
      }
      if (message.includes('not found') || message.includes('Not found')) {
        res.status(404).json({ error: message });
        return;
      }
      res.status(400).json({ error: message });
    }
  },

  async checkIn(req: AuthRequest, res: Response): Promise<void> {
    try {
      const booking = await checkinService.checkIn(req.params.id, req.user!.userId);
      res.json(booking);
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Check-in failed' });
    }
  },

  async getTokenBalance(req: AuthRequest, res: Response): Promise<void> {
    try {
      const locationId = req.user!.locationId;
      if (!locationId) {
        res.json({ tokensTotal: 0, tokensUsed: 0, tokensRemaining: 0 });
        return;
      }
      const balance = await tokenService.getBalance(locationId);
      res.json(balance);
    } catch (err: unknown) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch token balance' });
    }
  },

  async getInvited(req: AuthRequest, res: Response): Promise<void> {
    try {
      const bookings = await bookingService.getInvitedBookings(req.user!.userId);
      res.json(bookings);
    } catch (err: unknown) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch invited bookings' });
    }
  },

  async getColleagues(req: AuthRequest, res: Response): Promise<void> {
    try {
      const colleagues = await bookingService.getColleagues(req.user!.userId, req.user!.locationId, req.user!.companyId);
      res.json(colleagues);
    } catch (err: unknown) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch colleagues' });
    }
  },

  async checkInviteeConflicts(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { inviteeIds: raw, startTime, endTime, excludeBookingId } = req.query as Record<string, string>;
      if (!raw || !startTime || !endTime) {
        res.status(400).json({ error: 'inviteeIds, startTime, and endTime are required' });
        return;
      }
      const inviteeIds = raw.split(',').filter(Boolean);
      const conflicts = await bookingService.checkInviteeConflicts(
        inviteeIds,
        new Date(startTime),
        new Date(endTime),
        excludeBookingId || undefined,
      );
      res.json(conflicts);
    } catch (err: unknown) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to check invitee conflicts' });
    }
  },

  async cancelFromEmail(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.body;
      if (!token) {
        res.status(400).json({ error: 'Token is required' });
        return;
      }

      const secret = process.env.JWT_SECRET || 'secret';
      let payload: any;
      try {
        payload = jwt.verify(token, secret);
      } catch {
        res.status(401).json({ error: 'Invalid or expired cancel token' });
        return;
      }

      const { bookingId, userId } = payload;
      const booking = await bookingService.cancelBooking(bookingId, userId, 'EMPLOYEE');

      const now = new Date();
      const twoHoursBefore = new Date(booking.startTime.getTime() - 2 * 60 * 60 * 1000);
      const refunded = now <= twoHoursBefore;

      res.json({ cancelled: true, refunded });
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to cancel booking' });
    }
  },

  async createRecurring(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { title, roomId, startTime, endTime, notes, dayOfWeek, endDate } = req.body;
      if (!title || !roomId || !startTime || !endTime || !dayOfWeek || !endDate) {
        res.status(400).json({ error: 'title, roomId, startTime, endTime, dayOfWeek, and endDate are required' });
        return;
      }

      const user = req.user!;
      const locationId = user.locationId;
      if (!locationId) {
        res.status(400).json({ error: 'GLOBAL_ADMIN cannot create recurring bookings directly' });
        return;
      }

      const location = await import('../lib/prisma').then(m => m.default.location.findUnique({ where: { id: locationId } }));
      if (!location) { res.status(400).json({ error: 'Location not found' }); return; }

      const result = await recurringService.createSeries({
        userId: user.userId,
        companyId: user.companyId,
        locationId,
        roomId,
        title,
        notes,
        dayOfWeek: parseInt(dayOfWeek, 10),
        startTime,
        endTime,
        endDate: new Date(endDate),
        role: user.role,
        locationName: location.name,
      });

      res.status(201).json({
        series: result.series,
        created: result.created.length,
        skipped: result.skipped.length,
      });
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to create recurring series' });
    }
  },

  async listRecurring(req: AuthRequest, res: Response): Promise<void> {
    try {
      const series = await recurringService.listSeriesByUser(req.user!.userId);
      res.json(series);
    } catch (err: unknown) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch recurring series' });
    }
  },

  async cancelRecurring(req: AuthRequest, res: Response): Promise<void> {
    try {
      const result = await recurringService.cancelSeries(req.params.id, req.user!.userId, req.user!.role);
      res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to cancel series';
      if (message.includes('Not authorized')) {
        res.status(403).json({ error: message });
        return;
      }
      res.status(400).json({ error: message });
    }
  },

  async getBlackoutDates(req: AuthRequest, res: Response): Promise<void> {
    try {
      const locationId = req.user!.locationId;
      if (!locationId) { res.json([]); return; }
      const prisma = await import('../lib/prisma').then(m => m.default);
      const dates = await prisma.blackoutDate.findMany({
        where: { locationId },
        orderBy: { date: 'asc' },
        select: { id: true, date: true, reason: true },
      });
      res.json(dates);
    } catch (err: unknown) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch blackout dates' });
    }
  },

  async respondToInvite(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body as { status: 'ACCEPTED' | 'DECLINED' };
      if (status !== 'ACCEPTED' && status !== 'DECLINED') {
        res.status(400).json({ error: 'status must be ACCEPTED or DECLINED' });
        return;
      }
      const invite = await bookingService.respondToInvite(id, req.user!.userId, status);
      res.json(invite);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to respond to invite';
      if (message.includes('Not authorised')) {
        res.status(403).json({ error: message });
        return;
      }
      if (message.includes('not found')) {
        res.status(404).json({ error: message });
        return;
      }
      res.status(400).json({ error: message });
    }
  },
};
