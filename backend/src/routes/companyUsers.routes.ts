import { Router } from 'express';
import { companyUsersController } from '../controllers/companyUsers.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireCompanyAdmin } from '../middleware/requireCompanyAdmin.middleware';

const router = Router();

router.use(authMiddleware, requireCompanyAdmin);

router.get('/', companyUsersController.getAll);
router.get('/pending', companyUsersController.getPending);
router.post('/:id/approve', companyUsersController.approve);
router.post('/:id/reject', companyUsersController.reject);

export default router;
