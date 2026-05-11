import { Router } from 'express';
import { authenticate, requireRole } from '../middlewares/auth';
import { quickSearch, listAuditLogs, dailyReport } from '../controllers/misc.controller';

// IMPORTANT: this router is mounted at /api so it sees every /api/* request.
// We MUST NOT call `router.use(authenticate)` here — that would force auth on
// /api/health too, breaking the Electron startup probe. Each route opts in
// individually instead.
const router = Router();

router.get('/search', authenticate, quickSearch);
router.get('/audit', authenticate, requireRole(['OWNER']), listAuditLogs);
router.get('/daily-report', authenticate, dailyReport);

export default router;
