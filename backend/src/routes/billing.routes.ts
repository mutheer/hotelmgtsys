import { Router } from 'express';
import { authenticate, requireRole } from '../middlewares/auth';
import {
  getFolio,
  addServiceCharge,
  addPayment,
  addDiscount,
  deleteServiceCharge,
  deletePayment,
  deleteDiscount,
  issueDocument,
  listDocuments,
  checkoutFolio
} from '../controllers/billing.controller';

const router = Router();

router.use(authenticate);

router.get('/:id', getFolio);
router.post('/service', addServiceCharge);
router.delete('/service/:id', deleteServiceCharge);
router.post('/payment', addPayment);
router.delete('/payment/:id', deletePayment);
router.post('/discount', requireRole(['OWNER', 'ACCOUNTANT']), addDiscount);
router.delete('/discount/:id', requireRole(['OWNER', 'ACCOUNTANT']), deleteDiscount);
router.post('/:folioId/documents', issueDocument);
router.get('/:folioId/documents', listDocuments);
router.post('/:id/checkout', checkoutFolio);

export default router;
