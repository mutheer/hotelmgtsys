import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { getRoomStatuses, updateRoomStatus, getTasks, createTask, updateTask } from '../controllers/housekeeping.controller';

const router = Router();

router.use(authenticate);

router.get('/', getRoomStatuses);
router.put('/:id', updateRoomStatus);
router.get('/tasks', getTasks);
router.post('/tasks', createTask);
router.patch('/tasks/:id', updateTask);

export default router;
