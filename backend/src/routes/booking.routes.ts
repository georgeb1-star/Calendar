import { Router } from 'express';
import { bookingController } from '../controllers/booking.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware as any);

router.get('/', bookingController.getAll as any);
router.get('/mine', bookingController.getMine as any);
router.post('/', bookingController.create as any);
router.put('/:id', bookingController.update as any);
router.delete('/:id', bookingController.cancel as any);
router.post('/:id/checkin', bookingController.checkIn as any);

export default router;
