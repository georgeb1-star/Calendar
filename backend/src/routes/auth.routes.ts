import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/me', authMiddleware, authController.me as any);
router.put('/me', authMiddleware, authController.updateMe as any);
router.post('/register', authController.register);
router.get('/locations', authController.getLocations);
router.get('/companies', authController.getCompanies);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

export default router;
