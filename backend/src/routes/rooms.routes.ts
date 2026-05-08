import { getRoomTypes, createRoomType, getRooms, createRoom, getAvailableRooms } from '../controllers/rooms.controller';

const router = Router();

router.use(authenticate);

router.get('/types', getRoomTypes);
router.post('/types', requireRole(['OWNER', 'ACCOUNTANT']), createRoomType);

router.get('/', getRooms);
router.get('/available', getAvailableRooms);
router.post('/', requireRole(['OWNER', 'ACCOUNTANT']), createRoom);

export default router;
