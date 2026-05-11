import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { getBookings, createBooking, checkIn, cancelBooking, updateBooking, deleteBooking, createGroupBooking, listGroupBookings, cancelGroup, transferRoom, markNoShow } from '../controllers/bookings.controller';
import { requireRole } from '../middlewares/auth';

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
router.delete('/:id', requireRole(['OWNER']), deleteBooking);

export default router;
