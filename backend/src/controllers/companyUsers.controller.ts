import { Response } from 'express';
import { AuthRequest } from '../types';
import { userRepository } from '../repositories/user.repository';
import { notificationService } from '../services/notification.service';

export const companyUsersController = {
  async getPending(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const users = await userRepository.findPendingByCompany(companyId);
      res.json(users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        status: u.status,
        createdAt: u.createdAt,
        company: u.company,
      })));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const users = await userRepository.findByCompany(companyId);
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
      const companyId = req.user!.companyId;
      const user = await userRepository.findById(req.params.id);

      if (!user || user.companyId !== companyId) {
        res.status(404).json({ error: 'User not found' });
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
        companyName: user.company.name,
      }).catch(console.error);

      res.json({ message: 'User approved' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async reject(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const user = await userRepository.findById(req.params.id);

      if (!user || user.companyId !== companyId) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      if (user.status !== 'PENDING') {
        res.status(400).json({ error: 'User is not pending approval' });
        return;
      }

      notificationService.sendUserRejected({
        userEmail: user.email,
        userName: user.name,
        companyName: user.company.name,
      }).catch(console.error);

      await userRepository.delete(user.id);
      res.json({ message: 'User rejected and removed' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};
