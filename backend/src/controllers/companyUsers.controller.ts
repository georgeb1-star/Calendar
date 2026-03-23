import { Response } from 'express';
import { AuthRequest } from '../types';
import { userRepository } from '../repositories/user.repository';
import { notificationService } from '../services/notification.service';

export const companyUsersController = {
  async getPending(req: AuthRequest, res: Response): Promise<void> {
    try {
      const locationId = req.user!.locationId;
      if (!locationId) {
        res.status(400).json({ error: 'No location associated with your account' });
        return;
      }
      const users = await userRepository.findPendingByLocation(locationId);
      res.json(users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        status: u.status,
        createdAt: u.createdAt,
        location: u.location,
      })));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const locationId = req.user!.locationId;
      if (!locationId) {
        res.status(400).json({ error: 'No location associated with your account' });
        return;
      }
      const users = await userRepository.findByLocation(locationId);
      res.json(users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status,
        createdAt: u.createdAt,
      })));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async approve(req: AuthRequest, res: Response): Promise<void> {
    try {
      const locationId = req.user!.locationId;
      if (!locationId) {
        res.status(400).json({ error: 'No location associated with your account' });
        return;
      }
      const user = await userRepository.findById(req.params.id);

      if (!user || user.locationId !== locationId) {
        res.status(404).json({ error: 'User not found in your location' });
        return;
      }
      if (user.status !== 'PENDING') {
        res.status(400).json({ error: 'User is not pending approval' });
        return;
      }

      await userRepository.updateStatus(user.id, 'ACTIVE');

      notificationService.sendUserApproved({
        userEmail: user.email,
        userName: user.name,
        companyName: user.location?.name ?? user.company.name,
      }).catch(console.error);

      res.json({ message: 'User approved' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async reject(req: AuthRequest, res: Response): Promise<void> {
    try {
      const locationId = req.user!.locationId;
      if (!locationId) {
        res.status(400).json({ error: 'No location associated with your account' });
        return;
      }
      const user = await userRepository.findById(req.params.id);

      if (!user || user.locationId !== locationId) {
        res.status(404).json({ error: 'User not found in your location' });
        return;
      }
      if (user.status !== 'PENDING') {
        res.status(400).json({ error: 'User is not pending approval' });
        return;
      }

      notificationService.sendUserRejected({
        userEmail: user.email,
        userName: user.name,
        companyName: user.location?.name ?? user.company.name,
      }).catch(console.error);

      await userRepository.delete(user.id);
      res.json({ message: 'User rejected and removed' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};
