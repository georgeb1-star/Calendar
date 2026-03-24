import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireOfficeAdmin } from '../middleware/requireOfficeAdmin.middleware';

const router = Router();

router.use(authMiddleware as any);
router.use(requireOfficeAdmin as any);

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

// Location tokens (own location only)
router.get('/tokens', adminController.getLocationTokens as any);

// Rooms for this location
router.get('/rooms', adminController.getRooms as any);

// Blackout dates
router.get('/blackouts', adminController.listBlackouts as any);
router.post('/blackouts', adminController.createBlackout as any);
router.delete('/blackouts/:id', adminController.deleteBlackout as any);

// Room closures
router.get('/room-closures', adminController.listRoomClosures as any);
router.post('/room-closures', adminController.createRoomClosure as any);
router.delete('/room-closures/:id', adminController.deleteRoomClosure as any);

export default router;
