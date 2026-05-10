import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { getBookings, createBooking, checkIn, cancelBooking, updateBooking, createGroupBooking, listGroupBookings, cancelGroup, transferRoom, markNoShow } from '../controllers/bookings.controller';

const router = Router();

router.use(authenticate);

router.get('/', getBookings);
router.post('/', createBooking);
router.get('/groups', listGroupBookings);
router.post('/groups', createGroupBooking);
router.post('/groups/:id/cancel', cancelGroup);
router.post('/:id/checkin', checkIn);
router.post('/:id/cancel', cancelBooking);
router.post('/:id/transfer', transferRoom);
router.post('/:id/no-show', markNoShow);
router.patch('/:id', updateBooking);

export default router;
