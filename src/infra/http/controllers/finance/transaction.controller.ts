import { Response } from 'express';
import { TransactionService } from '../../../../application/services/transaction.service';
import { CreateTransactionDto } from '../../../../application/dto/finance/create-transaction.dto';
import { UpdateTransactionDto } from '../../../../application/dto/finance/update-transaction.dto';
import { AuthenticatedRequest } from '../../types/request.types';
import { UnauthorizedError } from '../../../../domain/errors/app-error';
import { sendSuccess } from '../../utils/response.util';
import { TransactionType } from '../../../../domain/finance/types/transaction.types';

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
      throw new UnauthorizedError('Usuario no autenticado');
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
      throw new UnauthorizedError('Usuario no autenticado');
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
      throw new UnauthorizedError('Usuario no autenticado');
    }

    const filters: {
      startDate?: Date;
      endDate?: Date;
      type?: TransactionType;
      categoryId?: string;
      paymentMethodId?: string;
      subtype?: string | null;
      excludeCardPayments?: boolean;
    } = {};

    if (req.query.startDate) {
      const startDateStr = req.query.startDate as string;
      filters.startDate = new Date(startDateStr.includes('T') ? startDateStr : `${startDateStr}T00:00:00.000Z`);
    }
    if (req.query.endDate) {
      const endDateStr = req.query.endDate as string;
      filters.endDate = new Date(endDateStr.includes('T') ? endDateStr : `${endDateStr}T23:59:59.999Z`);
    }
    if (req.query.type) {
      const typeValue = (req.query.type as string).toUpperCase();
      if (typeValue === TransactionType.INCOME || typeValue === TransactionType.EXPENSE) {
        filters.type = typeValue as TransactionType;
      }
    }
    if (req.query.categoryId) {
      filters.categoryId = req.query.categoryId as string;
    }
    if (req.query.paymentMethodId) {
      filters.paymentMethodId = req.query.paymentMethodId as string;
    }
    if (req.query.subtype) {
      filters.subtype = (req.query.subtype as string).toUpperCase();
    }
    if (req.query.excludeCardPayments === 'true') {
      filters.excludeCardPayments = true;
    }

    const transactions = await this.transactionService.getHistory(req.user.id, filters);
    sendSuccess(res, transactions);
  }

  /**
   * Updates an INCOME transaction.
   * Validates that the transaction belongs to the authenticated user and is of type INCOME.
   *
   * @param {AuthenticatedRequest} req Express request containing the identifier parameter and validated body.
   * @param {Response} res Express response used to send the updated transaction.
   * @returns {Promise<void>} Resolves when the response is dispatched.
   */
  public async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user?.id) {
      throw new UnauthorizedError('Usuario no autenticado');
    }

    const { id } = req.params;
    const updateTransactionDto: UpdateTransactionDto = req.body;
    const transaction = await this.transactionService.update(id, updateTransactionDto, req.user.id);
    sendSuccess(res, transaction);
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
      throw new UnauthorizedError('Usuario no autenticado');
    }

    const { id } = req.params;
    await this.transactionService.delete(id, req.user.id);
    sendSuccess(res, { message: 'Transacción eliminada exitosamente' }, 200);
  }
}

