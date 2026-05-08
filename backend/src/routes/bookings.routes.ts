import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { getBookings, createBooking, checkIn, cancelBooking, updateBooking } from '../controllers/bookings.controller';

const router = Router();

router.use(authenticate);

router.get('/', getBookings);
router.post('/', createBooking);
router.post('/:id/checkin', checkIn);
router.post('/:id/cancel', cancelBooking);
router.patch('/:id', updateBooking);

export default router;
