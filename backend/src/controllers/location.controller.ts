import { Request, Response } from 'express';
import { AuthRequest } from '../types';
import { locationService } from '../services/location.service';
import prisma from '../lib/prisma';

export const locationController = {
  // Public — used on signup page to populate the location selector
  async list(_req: Request, res: Response): Promise<void> {
    try {
      const locations = await prisma.location.findMany({
        where: { isActive: true },
        select: { id: true, name: true, address: true },
        orderBy: { name: 'asc' },
      });
      res.json(locations);
    } catch (err: unknown) {
      res.status(500).json({ error: 'Failed to fetch locations' });
    }
  },

  // GLOBAL_ADMIN — get a single location with stats
  async getOne(req: AuthRequest, res: Response): Promise<void> {
    try {
      const location = await locationService.getLocationById(req.params.id);
      if (!location) {
        res.status(404).json({ error: 'Location not found' });
        return;
      }
      res.json(location);
    } catch (err: unknown) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch location' });
    }
  },

  // GLOBAL_ADMIN — create a new location
  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { name, address, color } = req.body;
      if (!name) {
        res.status(400).json({ error: 'name is required' });
        return;
      }

      // Find the Nammu Workplace company
      const company = await prisma.company.findFirst({ orderBy: { createdAt: 'asc' } });
      if (!company) {
        res.status(400).json({ error: 'No company found' });
        return;
      }

      const location = await locationService.createLocation({ name, address, color, companyId: company.id });
      res.status(201).json(location);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create location';
      if (msg.includes('Unique constraint') || msg.includes('unique')) {
        res.status(409).json({ error: 'A location with that name already exists' });
        return;
      }
      res.status(400).json({ error: msg });
    }
  },

  // GLOBAL_ADMIN — update a location
  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const location = await locationService.updateLocation(req.params.id, req.body);
      res.json(location);
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update location' });
    }
  },

  // GLOBAL_ADMIN — soft-deactivate a location
  async deactivate(req: AuthRequest, res: Response): Promise<void> {
    try {
      const location = await locationService.deactivateLocation(req.params.id);
      res.json(location);
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to deactivate location' });
    }
  },
};
