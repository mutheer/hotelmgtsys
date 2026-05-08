import { Router } from 'express';
import { login, setupOwner } from '../controllers/auth.controller';

const router = Router();

router.post('/login', login);
router.post('/setup', setupOwner);

export default router;
