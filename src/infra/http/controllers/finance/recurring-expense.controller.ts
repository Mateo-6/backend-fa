import { param } from '../../utils/param.util';
import { Response } from 'express';
import { RecurringExpenseService } from '../../../../application/services/recurring-expense.service';
import { CreateRecurringDto } from '../../../../application/dto/finance/create-recurring.dto';
import { AuthenticatedRequest } from '../../types/request.types';
import { UnauthorizedError } from '../../../../domain/errors/app-error';
import { sendSuccess } from '../../utils/response.util';
import { RecurringExpense } from '../../../../domain/finance/types/recurring-expense.types';
import { logger } from '../../../utils/logger';

/**
 * Controller for handling recurring expense-related HTTP requests.
 */
export class RecurringExpenseController {
  /**
   * @param {RecurringExpenseService} recurringExpenseService Service encapsulating recurring expense business logic.
   */
  constructor(private readonly recurringExpenseService: RecurringExpenseService) {}

  /**
   * Creates a new recurring expense using the provided payload.
   * The userId is obtained from the JWT token (authenticated user).
   *
   * @param {AuthenticatedRequest} req Express request whose body contains the validated payload and user from JWT.
   * @param {Response} res Express response used to send the recurring expense.
   * @returns {Promise<void>} Resolves when the response is dispatched.
   */
  public async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user?.id) throw new UnauthorizedError('Usuario no autenticado');

    const { requestId, user } = req;
    const createRecurringDto: CreateRecurringDto = req.body;

    logger.info('Creating recurring expense', { requestId, userId: user.id, name: createRecurringDto.name });
    const recurringExpense = await this.recurringExpenseService.create(createRecurringDto, user.id);
    logger.info('Recurring expense created', { requestId, userId: user.id, recurringId: recurringExpense.id });
    sendSuccess(res, recurringExpense, 201);
  }

  /**
   * Retrieves all recurring expenses for the authenticated user.
   * The userId is obtained from the JWT token.
   *
   * @param {AuthenticatedRequest} req Express request containing the authenticated user from JWT.
   * @param {Response} res Express response used to send the recurring expense collection.
   * @returns {Promise<void>} Resolves when the response is dispatched.
   */
  public async getAll(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user?.id) throw new UnauthorizedError('Usuario no autenticado');

    const { requestId, user } = req;
    logger.info('Fetching recurring expenses', { requestId, userId: user.id });
    const recurringExpenses = await this.recurringExpenseService.findAllByUser(user.id);
    sendSuccess(res, recurringExpenses);
  }

  /**
   * Updates an existing recurring expense.
   * Validates that the recurring expense belongs to the authenticated user.
   *
   * @param {AuthenticatedRequest} req Express request containing the identifier parameter and validated body.
   * @param {Response} res Express response used to send the updated recurring expense.
   * @returns {Promise<void>} Resolves when the response is dispatched.
   */
  public async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user?.id) throw new UnauthorizedError('Usuario no autenticado');

    const { requestId, user } = req;
    const id = param(req, 'id');
    const updateData: Partial<Omit<RecurringExpense, 'id'>> = req.body;

    logger.info('Updating recurring expense', { requestId, userId: user.id, recurringId: id });
    const recurringExpense = await this.recurringExpenseService.update(id, updateData, user.id);
    sendSuccess(res, recurringExpense);
  }

  /**
   * Deletes a recurring expense by identifier.
   * Validates that the recurring expense belongs to the authenticated user.
   *
   * @param {AuthenticatedRequest} req Express request containing the identifier parameter.
   * @param {Response} res Express response used to send the confirmation.
   * @returns {Promise<void>} Resolves when the response is dispatched.
   */
  public async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user?.id) throw new UnauthorizedError('Usuario no autenticado');

    const { requestId, user } = req;
    const id = param(req, 'id');

    logger.info('Deleting recurring expense', { requestId, userId: user.id, recurringId: id });
    await this.recurringExpenseService.delete(id, user.id);
    sendSuccess(res, { message: 'Gasto recurrente eliminado exitosamente' }, 200);
  }
}
