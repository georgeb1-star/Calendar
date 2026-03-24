import { Router } from 'express';
import { globalAdminController } from '../controllers/global-admin.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireGlobalAdmin } from '../middleware/requireGlobalAdmin.middleware';
import { bookingService } from '../services/booking.service';

const router = Router();

router.use(authMiddleware as any);
router.use(requireGlobalAdmin as any);

// Location overview
router.get('/locations', globalAdminController.listLocations as any);
router.post('/locations', globalAdminController.createLocation as any);
router.get('/locations/:id/bookings', globalAdminController.getLocationBookings as any);
router.get('/locations/:id/pending', globalAdminController.getLocationPendingBookings as any);
router.get('/locations/:id/users', globalAdminController.getLocationUsers as any);
router.get('/locations/:id/rooms', globalAdminController.getLocationRooms as any);
router.post('/locations/:id/rooms', globalAdminController.createRoom as any);
router.get('/locations/:id/tokens', globalAdminController.getLocationTokens as any);
router.put('/locations/:id/tokens', globalAdminController.setLocationTokens as any);
router.get('/workspace-company', globalAdminController.getWorkspaceCompany as any);

// Cross-location analytics
router.get('/analytics', globalAdminController.getAnalytics as any);

export default router;
