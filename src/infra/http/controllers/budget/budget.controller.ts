import { Response } from 'express';
import { BudgetService } from '../../../../application/services/budget.service';
import { CreateBudgetDto } from '../../../../application/dto/budget/create-budget.dto';
import { UpdateBudgetDto } from '../../../../application/dto/budget/update-budget.dto';
import { AuthenticatedRequest } from '../../types/request.types';
import { sendSuccess } from '../../utils/response.util';
import { UnauthorizedError } from '../../../../domain/errors/app-error';
import { logger } from '../../../utils/logger';

/**
 * Controller for handling budget-related HTTP requests.
 */
export class BudgetController {
  /**
   * @param {BudgetService} budgetService Service encapsulating budget business logic.
   */
  constructor(private readonly budgetService: BudgetService) {}

  /**
   * Creates a new budget for the authenticated user.
   *
   * @param {AuthenticatedRequest} req Express request with validated budget payload in body.
   * @param {Response} res Express response.
   * @returns {Promise<void>}
   */
  public async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user?.id) throw new UnauthorizedError('Usuario no autenticado');

    const { requestId, user } = req;
    const dto: CreateBudgetDto = req.body;

    logger.info('Creating budget', { requestId, userId: user.id, name: dto.name });
    const budget = await this.budgetService.create(dto, user.id);
    logger.info('Budget created', { requestId, userId: user.id, budgetId: budget.id });
    sendSuccess(res, budget, 201);
  }

  /**
   * Retrieves all budgets for the authenticated user.
   * Supports query params: isActive (boolean), includeExpired (boolean).
   *
   * @param {AuthenticatedRequest} req Express request with optional query filters.
   * @param {Response} res Express response.
   * @returns {Promise<void>}
   */
  public async getAll(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user?.id) throw new UnauthorizedError('Usuario no autenticado');

    const { requestId, user } = req;
    const includeExpired = req.query.includeExpired === 'true';
    const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;

    logger.info('Fetching budgets', { requestId, userId: user.id, isActive, includeExpired });
    const budgets = await this.budgetService.getAll(user.id, { isActive, includeExpired });
    sendSuccess(res, budgets);
  }

  /**
   * Retrieves active budgets sorted by consumption percentage descending.
   * Used for the summary widget.
   *
   * @param {AuthenticatedRequest} req Express request.
   * @param {Response} res Express response.
   * @returns {Promise<void>}
   */
  public async getSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user?.id) throw new UnauthorizedError('Usuario no autenticado');

    const { requestId, user } = req;
    logger.info('Fetching budget summary', { requestId, userId: user.id });
    const budgets = await this.budgetService.getSummary(user.id);
    sendSuccess(res, budgets);
  }

  /**
   * Retrieves expired or inactive budgets for the authenticated user.
   *
   * @param {AuthenticatedRequest} req Express request.
   * @param {Response} res Express response.
   * @returns {Promise<void>}
   */
  public async getHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user?.id) throw new UnauthorizedError('Usuario no autenticado');

    const { requestId, user } = req;
    logger.info('Fetching budget history', { requestId, userId: user.id });
    const budgets = await this.budgetService.getHistory(user.id);
    sendSuccess(res, budgets);
  }

  /**
   * Retrieves a single budget by ID.
   *
   * @param {AuthenticatedRequest} req Express request with id param.
   * @param {Response} res Express response.
   * @returns {Promise<void>}
   */
  public async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user?.id) throw new UnauthorizedError('Usuario no autenticado');

    const { requestId, user } = req;
    const { id } = req.params;

    logger.info('Fetching budget by ID', { requestId, userId: user.id, budgetId: id });
    const budget = await this.budgetService.getById(id, user.id);
    sendSuccess(res, budget);
  }

  /**
   * Updates mutable fields of an existing budget.
   *
   * @param {AuthenticatedRequest} req Express request with id param and validated update payload.
   * @param {Response} res Express response.
   * @returns {Promise<void>}
   */
  public async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user?.id) throw new UnauthorizedError('Usuario no autenticado');

    const { requestId, user } = req;
    const { id } = req.params;
    const dto: UpdateBudgetDto = req.body;

    logger.info('Updating budget', { requestId, userId: user.id, budgetId: id });
    const budget = await this.budgetService.update(id, dto, user.id);
    sendSuccess(res, budget);
  }

  /**
   * Forces a recalculation of spent for a budget (e.g. when expenses were created before the budget).
   *
   * @param {AuthenticatedRequest} req Express request with id param.
   * @param {Response} res Express response.
   * @returns {Promise<void>}
   */
  public async recalculate(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user?.id) throw new UnauthorizedError('Usuario no autenticado');

    const { requestId, user } = req;
    const { id } = req.params;

    logger.info('Recalculating budget', { requestId, userId: user.id, budgetId: id });
    const budget = await this.budgetService.recalculate(id, user.id);
    sendSuccess(res, budget);
  }

  /**
   * Finalizes a budget (sets isActive to false, keeps history).
   *
   * @param {AuthenticatedRequest} req Express request with id param.
   * @param {Response} res Express response.
   * @returns {Promise<void>}
   */
  public async finalize(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user?.id) throw new UnauthorizedError('Usuario no autenticado');

    const { requestId, user } = req;
    const { id } = req.params;

    logger.info('Finalizing budget', { requestId, userId: user.id, budgetId: id });
    await this.budgetService.finalize(id, user.id);
    sendSuccess(res, null, 200);
  }

  /**
   * Permanently deletes a budget from the database.
   *
   * @param {AuthenticatedRequest} req Express request with id param.
   * @param {Response} res Express response.
   * @returns {Promise<void>}
   */
  public async permanentDelete(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user?.id) throw new UnauthorizedError('Usuario no autenticado');

    const { requestId, user } = req;
    const { id } = req.params;

    logger.info('Permanently deleting budget', { requestId, userId: user.id, budgetId: id });
    await this.budgetService.permanentDelete(id, user.id);
    sendSuccess(res, null, 200);
  }
}
