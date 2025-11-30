import { Response } from 'express';
import { TransactionService } from '../../../../application/services/transaction.service';
import { CreateTransactionDto } from '../../../../application/dto/finance/create-transaction.dto';
import { AuthenticatedRequest } from '../../types/request.types';
import { UnauthorizedError } from '../../../../domain/errors/app-error';
import { sendSuccess } from '../../utils/response.util';

/**
 * Controller for handling transaction-related HTTP requests.
 */
export class TransactionController {
  /**
   * @param {TransactionService} transactionService Service encapsulating transaction business logic.
   */
  constructor(private readonly transactionService: TransactionService) {}

  /**
   * Creates a new manual transaction using the provided payload.
   * The userId is obtained from the JWT token (authenticated user).
   *
   * @param {AuthenticatedRequest} req Express request whose body contains the validated payload and user from JWT.
   * @param {Response} res Express response used to send the transaction.
   * @returns {Promise<void>} Resolves when the response is dispatched.
   */
  public async createManual(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user?.id) {
      throw new UnauthorizedError('User not authenticated');
    }

    const createTransactionDto: CreateTransactionDto = req.body;
    const transaction = await this.transactionService.createManual(createTransactionDto, req.user.id);
    sendSuccess(res, transaction, 201);
  }

  /**
   * Processes a payment from a recurring expense.
   * Creates a transaction based on the recurring expense configuration.
   *
   * @param {AuthenticatedRequest} req Express request containing the recurring expense ID parameter.
   * @param {Response} res Express response used to send the created transaction.
   * @returns {Promise<void>} Resolves when the response is dispatched.
   */
  public async processRecurringPayment(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user?.id) {
      throw new UnauthorizedError('User not authenticated');
    }

    const { recurringExpenseId } = req.params;
    const transaction = await this.transactionService.processRecurringPayment(req.user.id, recurringExpenseId);
    sendSuccess(res, transaction, 201);
  }

  /**
   * Retrieves transaction history for the authenticated user with optional filters.
   * The userId is obtained from the JWT token.
   *
   * @param {AuthenticatedRequest} req Express request containing query parameters for filtering.
   * @param {Response} res Express response used to send the transaction collection.
   * @returns {Promise<void>} Resolves when the response is dispatched.
   */
  public async getHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user?.id) {
      throw new UnauthorizedError('User not authenticated');
    }

    const filters: {
      startDate?: Date;
      endDate?: Date;
      type?: string;
      categoryId?: string;
    } = {};

    if (req.query.startDate) {
      filters.startDate = new Date(req.query.startDate as string);
    }
    if (req.query.endDate) {
      filters.endDate = new Date(req.query.endDate as string);
    }
    if (req.query.type) {
      filters.type = req.query.type as string;
    }
    if (req.query.categoryId) {
      filters.categoryId = req.query.categoryId as string;
    }

    const transactions = await this.transactionService.getHistory(req.user.id, filters);
    sendSuccess(res, transactions);
  }

  /**
   * Deletes a transaction by identifier.
   * Validates that the transaction belongs to the authenticated user.
   *
   * @param {AuthenticatedRequest} req Express request containing the identifier parameter.
   * @param {Response} res Express response used to send the confirmation.
   * @returns {Promise<void>} Resolves when the response is dispatched.
   */
  public async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user?.id) {
      throw new UnauthorizedError('User not authenticated');
    }

    const { id } = req.params;
    await this.transactionService.delete(id, req.user.id);
    sendSuccess(res, null, 204);
  }
}

