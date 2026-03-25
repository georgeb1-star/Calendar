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

  async changeRole(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { role } = req.body;
      const requester = req.user!;
      const targetId = req.params.id;

      if (targetId === requester.userId) {
        res.status(400).json({ error: 'You cannot change your own role' });
        return;
      }

      const allowedRoles = requester.role === 'GLOBAL_ADMIN'
        ? ['EMPLOYEE', 'OFFICE_ADMIN', 'COMPANY_ADMIN', 'GLOBAL_ADMIN']
        : ['EMPLOYEE', 'OFFICE_ADMIN', 'COMPANY_ADMIN'];

      if (!allowedRoles.includes(role)) {
        res.status(403).json({ error: 'You cannot assign that role' });
        return;
      }

      // OFFICE_ADMIN can only change users in their location
      if (requester.role !== 'GLOBAL_ADMIN' && requester.locationId) {
        const target = await userRepository.findById(targetId);
        if (!target || target.locationId !== requester.locationId) {
          res.status(403).json({ error: 'User not found in your location' });
          return;
        }
      }

      const updated = await userRepository.updateRole(targetId, role);
      res.json(updated);
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update role' });
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

  // Blackout dates
  async listBlackouts(req: AuthRequest, res: Response): Promise<void> {
    try {
      const locationId = req.user!.locationId;
      if (!locationId) { res.status(400).json({ error: 'No location associated with your account' }); return; }
      const dates = await prisma.blackoutDate.findMany({
        where: { locationId },
        orderBy: { date: 'asc' },
      });
      res.json(dates);
    } catch (err: unknown) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch blackout dates' });
    }
  },

  async createBlackout(req: AuthRequest, res: Response): Promise<void> {
    try {
      const locationId = req.user!.locationId;
      if (!locationId) { res.status(400).json({ error: 'No location associated with your account' }); return; }
      const { date, reason } = req.body;
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        res.status(400).json({ error: 'date is required in YYYY-MM-DD format' });
        return;
      }
      const blackout = await prisma.blackoutDate.create({
        data: { locationId, date, reason: reason || null },
      });
      res.status(201).json(blackout);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create blackout date';
      if (msg.includes('P2002') || msg.includes('Unique constraint')) {
        res.status(409).json({ error: 'A blackout date already exists for that day' });
        return;
      }
      res.status(400).json({ error: msg });
    }
  },

  async deleteBlackout(req: AuthRequest, res: Response): Promise<void> {
    try {
      const locationId = req.user!.locationId;
      const existing = await prisma.blackoutDate.findUnique({ where: { id: req.params.id } });
      if (!existing || (locationId && existing.locationId !== locationId)) {
        res.status(404).json({ error: 'Blackout date not found' });
        return;
      }
      await prisma.blackoutDate.delete({ where: { id: req.params.id } });
      res.json({ deleted: true });
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to delete blackout date' });
    }
  },

  // Room closures
  async listRoomClosures(req: AuthRequest, res: Response): Promise<void> {
    try {
      const locationId = req.user!.locationId;
      if (!locationId) { res.status(400).json({ error: 'No location associated with your account' }); return; }
      const closures = await prisma.roomClosure.findMany({
        where: { room: { locationId } },
        include: { room: { select: { id: true, name: true } } },
        orderBy: [{ date: 'asc' }, { room: { name: 'asc' } }],
      });
      res.json(closures);
    } catch (err: unknown) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch room closures' });
    }
  },

  async createRoomClosure(req: AuthRequest, res: Response): Promise<void> {
    try {
      const locationId = req.user!.locationId;
      const { roomId, date, reason } = req.body;
      if (!roomId || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        res.status(400).json({ error: 'roomId and date (YYYY-MM-DD) are required' });
        return;
      }
      // Verify room belongs to admin's location
      const room = await prisma.room.findUnique({ where: { id: roomId } });
      if (!room || (locationId && room.locationId !== locationId)) {
        res.status(403).json({ error: 'Room not found in your location' });
        return;
      }
      const closure = await prisma.roomClosure.create({
        data: { roomId, date, reason: reason || null },
        include: { room: { select: { id: true, name: true } } },
      });
      res.status(201).json(closure);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create room closure';
      if (msg.includes('P2002') || msg.includes('Unique constraint')) {
        res.status(409).json({ error: 'A closure already exists for that room on that day' });
        return;
      }
      res.status(400).json({ error: msg });
    }
  },

  async deleteRoomClosure(req: AuthRequest, res: Response): Promise<void> {
    try {
      const locationId = req.user!.locationId;
      const existing = await prisma.roomClosure.findUnique({
        where: { id: req.params.id },
        include: { room: { select: { locationId: true } } },
      });
      if (!existing || (locationId && existing.room.locationId !== locationId)) {
        res.status(404).json({ error: 'Room closure not found' });
        return;
      }
      await prisma.roomClosure.delete({ where: { id: req.params.id } });
      res.json({ deleted: true });
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to delete room closure' });
    }
  },
};
