import { redisCacheService } from '../services/redis-cache.service';
import { OpenAiParserService } from '../services/openai-parser.service';
import { JwtTokenService } from '../services/jwt-token.service';
import { BcryptPasswordService } from '../services/bcrypt-password.service';

import { UserMongooseRepository } from '../repositories/user-mongoose.repository';
import { CategoryMongooseRepository } from '../repositories/category-mongoose.repository';
import { PaymentMethodMongooseRepository } from '../repositories/payment-method-mongoose.repository';
import { TransactionMongooseRepository } from '../repositories/transaction-mongoose.repository';
import { RecurringExpenseMongooseRepository } from '../repositories/recurring-expense-mongoose.repository';
import { BudgetMongooseRepository } from '../repositories/budget-mongoose.repository';
import { NotificationMongooseRepository } from '../repositories/notification-mongoose.repository';
import { RefreshTokenMongooseRepository } from '../repositories/refresh-token-mongoose.repository';

import { AuthService } from '../../application/services/auth.service';
import { UserService } from '../../application/services/user.service';
import { CategoryService } from '../../application/services/category.service';
import { PaymentMethodService } from '../../application/services/payment-method.service';
import { TransactionService } from '../../application/services/transaction.service';
import { RecurringExpenseService } from '../../application/services/recurring-expense.service';
import { BudgetService } from '../../application/services/budget.service';
import { SummaryService } from '../../application/services/summary.service';
import { CreditCardService } from '../../application/services/credit-card.service';
import { GmfService } from '../../application/services/gmf.service';
import { NotificationService } from '../../application/services/notification.service';
import { AmiService } from '../../application/services/ami.service';
import { MongooseTransactionRunner } from '../database/mongoose-transaction-runner';

// Repositories — one instance each, shared across all services
const userRepository = new UserMongooseRepository();
const categoryRepository = new CategoryMongooseRepository();
const paymentMethodRepository = new PaymentMethodMongooseRepository();
const transactionRepository = new TransactionMongooseRepository();
const recurringExpenseRepository = new RecurringExpenseMongooseRepository();
const budgetRepository = new BudgetMongooseRepository();
const notificationRepository = new NotificationMongooseRepository();
const refreshTokenRepository = new RefreshTokenMongooseRepository();

// Infrastructure services
const tokenService = new JwtTokenService();
const passwordService = new BcryptPasswordService();
const openAiParser = new OpenAiParserService();
const transactionRunner = new MongooseTransactionRunner();

// Application services — built in dependency order
const categoryService = new CategoryService(categoryRepository, userRepository, redisCacheService);
const paymentMethodService = new PaymentMethodService(paymentMethodRepository, userRepository, redisCacheService);
const budgetService = new BudgetService(budgetRepository, transactionRepository, notificationRepository, userRepository);
const creditCardService = new CreditCardService(paymentMethodRepository, transactionRepository);

const authService = new AuthService(userRepository, tokenService, passwordService, refreshTokenRepository);
const userService = new UserService(userRepository, passwordService, categoryRepository);
const transactionService = new TransactionService(
  transactionRepository,
  recurringExpenseRepository,
  categoryRepository,
  userRepository,
  paymentMethodRepository,
  paymentMethodService,
  transactionRunner,
  budgetService,
);
const recurringExpenseService = new RecurringExpenseService(recurringExpenseRepository, userRepository, paymentMethodRepository);
const summaryService = new SummaryService(transactionRepository, recurringExpenseRepository, creditCardService, paymentMethodRepository);
const gmfService = new GmfService(transactionRepository, paymentMethodRepository);
const notificationService = new NotificationService(userRepository, notificationRepository);
const amiService = new AmiService(openAiParser, categoryService, paymentMethodService, redisCacheService);

export const container = {
  tokenService,
  authService,
  userService,
  categoryService,
  paymentMethodService,
  transactionService,
  recurringExpenseService,
  budgetService,
  summaryService,
  creditCardService,
  gmfService,
  notificationService,
  amiService,
};
