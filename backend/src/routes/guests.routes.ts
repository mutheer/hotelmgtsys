import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { getGuests, getGuestById, createGuest, updateGuest } from '../controllers/guests.controller';

const router = Router();

router.use(authenticate);

router.get('/', getGuests);
router.get('/:id', getGuestById);
router.post('/', createGuest);
router.put('/:id', updateGuest);

export default router;
