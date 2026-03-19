import { Request, Response } from 'express';
import { AuthRequest } from '../types';
import { roomRepository } from '../repositories/room.repository';

export const roomController = {
  async getAll(_req: Request, res: Response): Promise<void> {
    try {
      const rooms = await roomRepository.findAll();
      res.json(rooms);
    } catch (err: unknown) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch rooms' });
    }
  },

  async getAvailability(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { date } = req.query;

      if (!date) {
        res.status(400).json({ error: 'date query parameter is required (YYYY-MM-DD)' });
        return;
      }

      const from = new Date(`${date}T00:00:00.000Z`);
      const to = new Date(`${date}T23:59:59.999Z`);

      const bookings = await roomRepository.getBookingsForRoom(id, from, to);

      // Generate 30-min slots from 8am to 6pm
      const slots = [];
      const slotStart = new Date(`${date}T08:00:00.000Z`);
      const slotEnd = new Date(`${date}T18:00:00.000Z`);

      let current = slotStart;
      while (current < slotEnd) {
        const next = new Date(current.getTime() + 30 * 60 * 1000);
        const isBooked = bookings.some(
          (b) => b.startTime < next && b.endTime > current
        );
        slots.push({
          start: current.toISOString(),
          end: next.toISOString(),
          available: !isBooked,
        });
        current = next;
      }

      res.json({ roomId: id, date, slots });
    } catch (err: unknown) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch availability' });
    }
  },

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { name, capacity, amenities } = req.body;
      if (!name || !capacity) {
        res.status(400).json({ error: 'name and capacity are required' });
        return;
      }
      const room = await roomRepository.create({ name, capacity, amenities });
      res.status(201).json(room);
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to create room' });
    }
  },

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const room = await roomRepository.update(req.params.id, req.body);
      res.json(room);
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update room' });
    }
  },
};
