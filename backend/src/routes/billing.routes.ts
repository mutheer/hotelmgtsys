import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { getFolio, addServiceCharge, addPayment, checkoutFolio } from '../controllers/billing.controller';

const router = Router();

router.use(authenticate);

router.get('/:id', getFolio);
router.post('/service', addServiceCharge);
router.post('/payment', addPayment);
router.post('/:id/checkout', checkoutFolio);

export default router;
