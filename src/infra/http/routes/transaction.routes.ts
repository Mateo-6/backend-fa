import { Router } from 'express';
import { TransactionController } from '../controllers/finance/transaction.controller';
import { TransactionService } from '../../../application/services/transaction.service';
import { PaymentMethodService } from '../../../application/services/payment-method.service';
import { CategoryService } from '../../../application/services/category.service';
import { AmiService } from '../../../application/services/ami.service';
import { OpenAiParserService } from '../../services/openai-parser.service';
import { BudgetService } from '../../../application/services/budget.service';
import { TransactionMongooseRepository } from '../../repositories/transaction-mongoose.repository';
import { RecurringExpenseMongooseRepository } from '../../repositories/recurring-expense-mongoose.repository';
import { CategoryMongooseRepository } from '../../repositories/category-mongoose.repository';
import { UserMongooseRepository } from '../../repositories/user-mongoose.repository';
import { PaymentMethodMongooseRepository } from '../../repositories/payment-method-mongoose.repository';
import { BudgetMongooseRepository } from '../../repositories/budget-mongoose.repository';
import { NotificationMongooseRepository } from '../../repositories/notification-mongoose.repository';
import { redisCacheService } from '../../services/redis-cache.service';
import { validate } from '../middleware/validation.middleware';
import { createTransactionSchema } from '../../../application/dto/finance/create-transaction.dto';
import { updateTransactionSchema } from '../../../application/dto/finance/update-transaction.dto';
import { transactionHistoryQuerySchema } from '../../../application/dto/finance/transaction-history-query.dto';
import { ParseIntentRequestSchema } from '../../../application/dto/finance/parse-intent.dto';
import { asyncHandler } from '../middleware/async-handler.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { amiRateLimit } from '../middleware/ami-rate-limit.middleware';
import { JwtTokenService } from '../../services/jwt-token.service';

const router = Router();

// Dependency injection setup
const transactionRepository = new TransactionMongooseRepository();
const recurringExpenseRepository = new RecurringExpenseMongooseRepository();
const categoryRepository = new CategoryMongooseRepository();
const userRepository = new UserMongooseRepository();
const paymentMethodRepository = new PaymentMethodMongooseRepository();
const budgetRepository = new BudgetMongooseRepository();
const notificationRepository = new NotificationMongooseRepository();
const paymentMethodService = new PaymentMethodService(paymentMethodRepository, userRepository, redisCacheService);
const categoryService = new CategoryService(categoryRepository, userRepository, redisCacheService);
const budgetService = new BudgetService(
  budgetRepository,
  transactionRepository,
  notificationRepository,
  userRepository
);
const transactionService = new TransactionService(
  transactionRepository,
  recurringExpenseRepository,
  categoryRepository,
  userRepository,
  paymentMethodRepository,
  paymentMethodService,
  budgetService
);
const openAiParser = new OpenAiParserService();
const amiService = new AmiService(openAiParser, categoryService, paymentMethodService, redisCacheService);
const transactionController = new TransactionController(transactionService, amiService);
const tokenService = new JwtTokenService();

// All transaction routes are protected with authentication middleware
// parse-intent MUST be registered before /:id to avoid parameter capture
router.post(
  '/parse-intent',
  authMiddleware(tokenService),
  amiRateLimit,
  validate(ParseIntentRequestSchema),
  asyncHandler(transactionController.parseIntent.bind(transactionController))
);
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
  validate(transactionHistoryQuerySchema, 'query'),
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

