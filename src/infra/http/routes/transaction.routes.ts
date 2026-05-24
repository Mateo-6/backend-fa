import { Router } from 'express';
import { TransactionController } from '../controllers/finance/transaction.controller';
import { validate } from '../middleware/validation.middleware';
import { createTransactionSchema } from '../../../application/dto/finance/create-transaction.dto';
import { updateTransactionSchema } from '../../../application/dto/finance/update-transaction.dto';
import { transactionHistoryQuerySchema } from '../../../application/dto/finance/transaction-history-query.dto';
import { ParseIntentRequestSchema } from '../../../application/dto/finance/parse-intent.dto';
import { asyncHandler } from '../middleware/async-handler.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { amiRateLimit } from '../middleware/rate-limit.middleware';
import { container } from '../../factories/service.factory';

const router = Router();

const transactionController = new TransactionController(container.transactionService, container.amiService);

// parse-intent MUST be registered before /:id to avoid parameter capture
router.post('/parse-intent', authMiddleware(container.tokenService), amiRateLimit, validate(ParseIntentRequestSchema), asyncHandler(transactionController.parseIntent.bind(transactionController)));
router.post('/manual', authMiddleware(container.tokenService), validate(createTransactionSchema), asyncHandler(transactionController.createManual.bind(transactionController)));
router.post('/recurring/:recurringExpenseId', authMiddleware(container.tokenService), asyncHandler(transactionController.processRecurringPayment.bind(transactionController)));
router.get('/history', authMiddleware(container.tokenService), validate(transactionHistoryQuerySchema, 'query'), asyncHandler(transactionController.getHistory.bind(transactionController)));
router.put('/:id', authMiddleware(container.tokenService), validate(updateTransactionSchema), asyncHandler(transactionController.update.bind(transactionController)));
router.delete('/:id', authMiddleware(container.tokenService), asyncHandler(transactionController.delete.bind(transactionController)));

export default router;
