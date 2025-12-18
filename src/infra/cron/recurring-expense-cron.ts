import * as cron from 'node-cron';
import { RecurringExpenseCronService } from '../../application/services/recurring-expense-cron.service';
import { RecurringExpenseMongooseRepository } from '../repositories/recurring-expense-mongoose.repository';
import { TransactionService } from '../../application/services/transaction.service';
import { TransactionMongooseRepository } from '../repositories/transaction-mongoose.repository';
import { CategoryMongooseRepository } from '../repositories/category-mongoose.repository';
import { UserMongooseRepository } from '../repositories/user-mongoose.repository';
import { PaymentMethodMongooseRepository } from '../repositories/payment-method-mongoose.repository';

/**
 * Initializes and starts the cron job for processing recurring expenses.
 * The job runs daily at midnight (00:00) to process all recurring expenses that are due for payment.
 *
 * @returns {cron.ScheduledTask} The scheduled cron task.
 */
export function startRecurringExpenseCron(): cron.ScheduledTask {
  // Initialize dependencies
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

  // Schedule the job to run daily at midnight (00:00)
  // Cron expression: '0 0 * * *' means: minute 0, hour 0, every day, every month, every day of week
  const task = cron.schedule('0 0 * * *', async () => {
    console.log(`[Cron Job] Starting daily recurring expense processing at ${new Date().toISOString()}`);
    try {
      await cronService.processDueRecurringExpenses();
    } catch (error) {
      console.error('[Cron Job] Unhandled error in cron job execution:', error);
    }
  });

  console.log('✅ Recurring expense cron job scheduled to run daily at 00:00');

  return task;
}
