import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import {
  listQuotations, getQuotation, createQuotation, updateQuotation,
  deleteQuotation, nextQuoteNumber
} from '../controllers/quotations.controller';

const router = Router();
router.use(authenticate);

router.get('/next-number', nextQuoteNumber);
router.get('/', listQuotations);
router.get('/:id', getQuotation);
router.post('/', createQuotation);
router.patch('/:id', updateQuotation);
router.delete('/:id', deleteQuotation);

export default router;
