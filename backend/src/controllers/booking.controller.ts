import { Response } from 'express';
import { AuthRequest } from '../types';
import { bookingService } from '../services/booking.service';
import { checkinService } from '../services/checkin.service';
import { tokenService } from '../services/token.service';

export const bookingController = {
  async getAll(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const bookings = await bookingService.getAllBookings();
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
      const { title, roomId, startTime, endTime, notes } = req.body;
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
        userId: req.user!.userId,
        companyId: req.user!.companyId,
        role: req.user!.role,
      });

      res.status(201).json(booking);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create booking';
      // Overlap constraint violation
      if (message.includes('P2002') || message.includes('no_overlap') || message.includes('exclusion')) {
        res.status(409).json({ error: 'This room is already booked for the requested time' });
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
      const balance = await tokenService.getBalance(req.user!.companyId);
      res.json(balance);
    } catch (err: unknown) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch token balance' });
    }
  },
};
