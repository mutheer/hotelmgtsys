import { Router } from 'express';
import { authenticate, requireRole } from '../middlewares/auth';
import { getSettings, updateSetting } from '../controllers/settings.controller';

const router = Router();

router.use(authenticate);

router.get('/', requireRole(['OWNER', 'ACCOUNTANT']), getSettings);
router.post('/', requireRole(['OWNER']), updateSetting);

export default router;
