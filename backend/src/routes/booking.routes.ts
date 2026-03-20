import { Router } from 'express';
import { bookingController } from '../controllers/booking.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Public — token is the credential
router.post('/cancel-from-email', bookingController.cancelFromEmail as any);

router.use(authMiddleware as any);

router.get('/token-balance', bookingController.getTokenBalance as any);
router.get('/mine', bookingController.getMine as any);
router.get('/invited', bookingController.getInvited as any);
router.get('/colleagues', bookingController.getColleagues as any);
router.get('/recurring', bookingController.listRecurring as any);
router.post('/recurring', bookingController.createRecurring as any);
router.delete('/recurring/:id', bookingController.cancelRecurring as any);
router.get('/', bookingController.getAll as any);
router.post('/', bookingController.create as any);
router.put('/:id', bookingController.update as any);
router.delete('/:id', bookingController.cancel as any);
router.post('/:id/checkin', bookingController.checkIn as any);

export default router;
