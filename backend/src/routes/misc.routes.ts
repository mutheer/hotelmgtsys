import { Router } from 'express';
import { authenticate, requireRole } from '../middlewares/auth';
import { quickSearch, listAuditLogs, dailyReport } from '../controllers/misc.controller';

const router = Router();
router.use(authenticate);

router.get('/search', quickSearch);
router.get('/audit', requireRole(['OWNER']), listAuditLogs);
router.get('/daily-report', dailyReport);

export default router;
