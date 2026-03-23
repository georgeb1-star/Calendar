import { Router } from 'express';
import { roomController } from '../controllers/room.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireOfficeAdmin } from '../middleware/requireOfficeAdmin.middleware';

const router = Router();

// GET and availability work with optional auth (locationId from user if authenticated)
router.get('/', authMiddleware as any, roomController.getAll as any);
router.get('/:id/availability', roomController.getAvailability);
router.post('/', authMiddleware as any, requireOfficeAdmin as any, roomController.create as any);
router.put('/:id', authMiddleware as any, requireOfficeAdmin as any, roomController.update as any);

export default router;
