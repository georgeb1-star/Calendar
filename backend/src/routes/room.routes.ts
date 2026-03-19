import { Router } from 'express';
import { roomController } from '../controllers/room.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/requireAdmin.middleware';

const router = Router();

router.get('/', roomController.getAll);
router.get('/:id/availability', roomController.getAvailability);
router.post('/', authMiddleware as any, requireAdmin as any, roomController.create as any);
router.put('/:id', authMiddleware as any, requireAdmin as any, roomController.update as any);

export default router;
