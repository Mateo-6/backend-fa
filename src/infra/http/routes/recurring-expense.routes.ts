import { Router } from 'express';
import { RecurringExpenseController } from '../controllers/finance/recurring-expense.controller';
import { RecurringExpenseService } from '../../../application/services/recurring-expense.service';
import { RecurringExpenseMongooseRepository } from '../../repositories/recurring-expense-mongoose.repository';
import { UserMongooseRepository } from '../../repositories/user-mongoose.repository';
import { PaymentMethodMongooseRepository } from '../../repositories/payment-method-mongoose.repository';
import { validate } from '../middleware/validation.middleware';
import { createRecurringSchema } from '../../../application/dto/finance/create-recurring.dto';
import { asyncHandler } from '../middleware/async-handler.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { JwtTokenService } from '../../services/jwt-token.service';

const router = Router();

// Dependency injection setup
const recurringExpenseRepository = new RecurringExpenseMongooseRepository();
const userRepository = new UserMongooseRepository();
const paymentMethodRepository = new PaymentMethodMongooseRepository();
const recurringExpenseService = new RecurringExpenseService(
  recurringExpenseRepository,
  userRepository,
  paymentMethodRepository
);
const recurringExpenseController = new RecurringExpenseController(recurringExpenseService);
const tokenService = new JwtTokenService();

// All recurring expense routes are protected with authentication middleware
router.post(
  '/',
  authMiddleware(tokenService),
  validate(createRecurringSchema),
  asyncHandler(recurringExpenseController.create.bind(recurringExpenseController))
);
router.get(
  '/',
  authMiddleware(tokenService),
  asyncHandler(recurringExpenseController.getAll.bind(recurringExpenseController))
);
router.put(
  '/:id',
  authMiddleware(tokenService),
  asyncHandler(recurringExpenseController.update.bind(recurringExpenseController))
);
router.delete(
  '/:id',
  authMiddleware(tokenService),
  asyncHandler(recurringExpenseController.delete.bind(recurringExpenseController))
);

export default router;

