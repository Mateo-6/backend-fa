import { Request, Response } from 'express';
import { RecurringExpenseCronService } from '../../../application/services/recurring-expense-cron.service';
import { sendSuccess } from '../utils/response.util';
import { asyncHandler } from '../middleware/async-handler.middleware';

/**
 * Controller for manual cron job execution.
 */
export class CronController {
  /**
   * @param {RecurringExpenseCronService} cronService Service for processing recurring expenses.
   */
  constructor(private readonly cronService: RecurringExpenseCronService) {}

  /**
   * Manually triggers the recurring expense processing job.
   * This endpoint allows you to execute the cron job on demand for testing or manual processing.
   *
   * @param {Request} req Express request object.
   * @param {Response} res Express response used to send the processing results.
   * @returns {Promise<void>} Resolves when the response is dispatched.
   */
  public processRecurringExpenses = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const result = await this.cronService.processDueRecurringExpenses();
    sendSuccess(res, result, 200);
  });
}
