import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/requireAdmin.middleware';

const router = Router();

router.use(authMiddleware as any);
router.use(requireAdmin as any);

// User management
router.post('/users', adminController.createUser as any);
router.get('/users', adminController.getUsers as any);
router.delete('/users/:id', adminController.deleteUser as any);

// Booking approvals
router.get('/bookings/pending', adminController.getPendingBookings as any);
router.post('/bookings/:id/approve', adminController.approveBooking as any);
router.post('/bookings/:id/reject', adminController.rejectBooking as any);

// Analytics
router.get('/analytics/utilisation', adminController.getUtilisation as any);
router.get('/analytics/company-hours', adminController.getCompanyHours as any);
router.get('/analytics/peak-times', adminController.getPeakTimes as any);
router.get('/analytics/cancellations', adminController.getCancellations as any);

export default router;
