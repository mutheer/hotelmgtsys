import { Router } from 'express';
import { authenticate, requireRole } from '../middlewares/auth';
import { getDashboardStats, getRevenueReport, getOccupancyReport } from '../controllers/reports.controller';

const router = Router();

router.use(authenticate);

// Only Owners and Accountants see high-level revenue stats
router.get('/dashboard', requireRole(['OWNER', 'ACCOUNTANT']), getDashboardStats);
router.get('/revenue', requireRole(['OWNER', 'ACCOUNTANT']), getRevenueReport);
router.get('/occupancy', requireRole(['OWNER', 'ACCOUNTANT']), getOccupancyReport);

export default router;
