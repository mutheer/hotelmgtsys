import { Router } from 'express';
import { authenticate, requireRole } from '../middlewares/auth';
import { getDashboardStats } from '../controllers/reports.controller';

const router = Router();

router.use(authenticate);

// Only Owners and Accountants see high-level revenue stats
router.get('/dashboard', requireRole(['OWNER', 'ACCOUNTANT']), getDashboardStats);

export default router;
