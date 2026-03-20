import { Router } from 'express';
import { billingController } from '../controllers/billing.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireCompanyAdmin } from '../middleware/requireCompanyAdmin.middleware';

const router = Router();

router.use(authMiddleware, requireCompanyAdmin);

router.get('/subscription', billingController.getSubscription);
router.post('/checkout', billingController.createCheckout);
router.post('/portal', billingController.createPortal);

export default router;
