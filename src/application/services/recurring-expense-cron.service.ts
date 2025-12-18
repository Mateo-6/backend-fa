import { RecurringExpenseRepository } from '../../domain/finance/repositories/recurring-expense.repository';
import { TransactionService } from './transaction.service';

/**
 * Service for processing recurring expenses via cron job.
 * Validates and processes recurring expenses that are due for payment.
 */
export class RecurringExpenseCronService {
  /**
   * @param {RecurringExpenseRepository} recurringExpenseRepository Repository for recurring expense operations.
   * @param {TransactionService} transactionService Service for processing recurring payments.
   */
  constructor(
    private readonly recurringExpenseRepository: RecurringExpenseRepository,
    private readonly transactionService: TransactionService
  ) {}

  /**
   * Processes all recurring expenses that are due for payment.
   * Finds all active recurring expenses where nextPaymentDate is today or earlier,
   * and processes each one by creating a transaction and updating the next payment date.
   *
   * @returns {Promise<{ processed: number; errors: number }>} Object containing the count of processed expenses and errors.
   */
  async processDueRecurringExpenses(): Promise<{ processed: number; errors: number }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      const dueExpenses = await this.recurringExpenseRepository.findDueForPayment(today);

      if (dueExpenses.length === 0) {
        console.log(`[Cron Job] No recurring expenses due for payment on ${today.toISOString().split('T')[0]}`);
        return { processed: 0, errors: 0 };
      }

      console.log(`[Cron Job] Found ${dueExpenses.length} recurring expense(s) due for payment`);

      let processed = 0;
      let errors = 0;

      for (const expense of dueExpenses) {
        try {
          if (!expense.id) {
            console.error(`[Cron Job] Skipping expense without ID: ${expense.name}`);
            errors++;
            continue;
          }

          // Process the recurring payment
          await this.transactionService.processRecurringPayment(expense.userId, expense.id);
          processed++;
          console.log(`[Cron Job] Successfully processed recurring expense: ${expense.name} (ID: ${expense.id})`);
        } catch (error) {
          errors++;
          console.error(
            `[Cron Job] Error processing recurring expense ${expense.name} (ID: ${expense.id}):`,
            error instanceof Error ? error.message : String(error)
          );
        }
      }

      console.log(
        `[Cron Job] Completed processing. Processed: ${processed}, Errors: ${errors}, Total: ${dueExpenses.length}`
      );

      return { processed, errors };
    } catch (error) {
      console.error('[Cron Job] Fatal error while processing recurring expenses:', error);
      throw error;
    }
  }
}
