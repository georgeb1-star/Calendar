import { Router } from 'express';
import { locationController } from '../controllers/location.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireGlobalAdmin } from '../middleware/requireGlobalAdmin.middleware';

const router = Router();

// Public: list active locations (used on signup page)
router.get('/', locationController.list);

// GLOBAL_ADMIN: management
router.get('/:id', authMiddleware as any, requireGlobalAdmin as any, locationController.getOne as any);
router.post('/', authMiddleware as any, requireGlobalAdmin as any, locationController.create as any);
router.put('/:id', authMiddleware as any, requireGlobalAdmin as any, locationController.update as any);
router.delete('/:id', authMiddleware as any, requireGlobalAdmin as any, locationController.deactivate as any);

export default router;
