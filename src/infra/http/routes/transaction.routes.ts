import { Router } from 'express';
import { TransactionController } from '../controllers/finance/transaction.controller';
import { TransactionService } from '../../../application/services/transaction.service';
import { PaymentMethodService } from '../../../application/services/payment-method.service';
import { TransactionMongooseRepository } from '../../repositories/transaction-mongoose.repository';
import { RecurringExpenseMongooseRepository } from '../../repositories/recurring-expense-mongoose.repository';
import { CategoryMongooseRepository } from '../../repositories/category-mongoose.repository';
import { UserMongooseRepository } from '../../repositories/user-mongoose.repository';
import { PaymentMethodMongooseRepository } from '../../repositories/payment-method-mongoose.repository';
import { validate } from '../middleware/validation.middleware';
import { createTransactionSchema } from '../../../application/dto/finance/create-transaction.dto';
import { updateTransactionSchema } from '../../../application/dto/finance/update-transaction.dto';
import { asyncHandler } from '../middleware/async-handler.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { JwtTokenService } from '../../services/jwt-token.service';

const router = Router();

// Dependency injection setup
const transactionRepository = new TransactionMongooseRepository();
const recurringExpenseRepository = new RecurringExpenseMongooseRepository();
const categoryRepository = new CategoryMongooseRepository();
const userRepository = new UserMongooseRepository();
const paymentMethodRepository = new PaymentMethodMongooseRepository();
const paymentMethodService = new PaymentMethodService(paymentMethodRepository, userRepository);
const transactionService = new TransactionService(
  transactionRepository,
  recurringExpenseRepository,
  categoryRepository,
  userRepository,
  paymentMethodRepository,
  paymentMethodService
);
const transactionController = new TransactionController(transactionService);
const tokenService = new JwtTokenService();

// All transaction routes are protected with authentication middleware
router.post(
  '/manual',
  authMiddleware(tokenService),
  validate(createTransactionSchema),
  asyncHandler(transactionController.createManual.bind(transactionController))
);
router.post(
  '/recurring/:recurringExpenseId',
  authMiddleware(tokenService),
  asyncHandler(transactionController.processRecurringPayment.bind(transactionController))
);
router.get(
  '/history',
  authMiddleware(tokenService),
  asyncHandler(transactionController.getHistory.bind(transactionController))
);
router.put(
  '/:id',
  authMiddleware(tokenService),
  validate(updateTransactionSchema),
  asyncHandler(transactionController.update.bind(transactionController))
);
router.delete(
  '/:id',
  authMiddleware(tokenService),
  asyncHandler(transactionController.delete.bind(transactionController))
);

export default router;

