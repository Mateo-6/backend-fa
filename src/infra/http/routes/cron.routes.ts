import { Router } from 'express';
import { CronController } from '../controllers/cron.controller';
import { RecurringExpenseCronService } from '../../../application/services/recurring-expense-cron.service';
import { RecurringExpenseMongooseRepository } from '../../repositories/recurring-expense-mongoose.repository';
import { TransactionService } from '../../../application/services/transaction.service';
import { TransactionMongooseRepository } from '../../repositories/transaction-mongoose.repository';
import { CategoryMongooseRepository } from '../../repositories/category-mongoose.repository';
import { UserMongooseRepository } from '../../repositories/user-mongoose.repository';
import { PaymentMethodMongooseRepository } from '../../repositories/payment-method-mongoose.repository';

const router = Router();

// Dependency injection setup
const recurringExpenseRepository = new RecurringExpenseMongooseRepository();
const transactionRepository = new TransactionMongooseRepository();
const categoryRepository = new CategoryMongooseRepository();
const userRepository = new UserMongooseRepository();
const paymentMethodRepository = new PaymentMethodMongooseRepository();

const transactionService = new TransactionService(
  transactionRepository,
  recurringExpenseRepository,
  categoryRepository,
  userRepository,
  paymentMethodRepository
);

const cronService = new RecurringExpenseCronService(recurringExpenseRepository, transactionService);
const cronController = new CronController(cronService);

// Manual execution endpoint (no authentication required for local development)
// In production, you might want to add authentication or IP whitelist
router.post('/process-recurring-expenses', cronController.processRecurringExpenses);

export default router;
