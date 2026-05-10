import { Router } from 'express';
import { login, setupOwner, getUsers, createUser, updateUser, changeMyPassword } from '../controllers/auth.controller';
import { authenticate, requireRole } from '../middlewares/auth';

const router = Router();

router.post('/login', login);
router.post('/setup', setupOwner);
router.post('/change-password', authenticate, changeMyPassword);

// Staff management — OWNER only
router.get('/users', authenticate, requireRole(['OWNER']), getUsers);
router.post('/users', authenticate, requireRole(['OWNER']), createUser);
router.patch('/users/:id', authenticate, requireRole(['OWNER']), updateUser);

export default router;
