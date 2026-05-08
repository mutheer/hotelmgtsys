import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { getBookings, createBooking, checkIn } from '../controllers/bookings.controller';

const router = Router();

router.use(authenticate);

router.get('/', getBookings);
router.post('/', createBooking);
router.post('/:id/checkin', checkIn);

export default router;
