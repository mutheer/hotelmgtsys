import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { getRoomStatuses, updateRoomStatus } from '../controllers/housekeeping.controller';

const router = Router();

router.use(authenticate);

router.get('/', getRoomStatuses);
router.put('/:id', updateRoomStatus);

export default router;
