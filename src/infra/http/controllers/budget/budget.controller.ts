import { Response } from 'express';
import { BudgetService } from '../../../../application/services/budget.service';
import { CreateBudgetDto } from '../../../../application/dto/budget/create-budget.dto';
import { UpdateBudgetDto } from '../../../../application/dto/budget/update-budget.dto';
import { AuthenticatedRequest } from '../../types/request.types';
import { sendSuccess } from '../../utils/response.util';
import { UnauthorizedError } from '../../../../domain/errors/app-error';

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
    const dto: CreateBudgetDto = req.body;
    const budget = await this.budgetService.create(dto, req.user.id);
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
    const includeExpired = req.query.includeExpired === 'true';
    const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;
    const budgets = await this.budgetService.getAll(req.user.id, { isActive, includeExpired });
    sendSuccess(res, budgets);
  }

  /**
   * Retrieves active budgets sorted by consumption percentage descending.
   * Used for the dashboard widget.
   *
   * @param {AuthenticatedRequest} req Express request.
   * @param {Response} res Express response.
   * @returns {Promise<void>}
   */
  public async getSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user?.id) throw new UnauthorizedError('Usuario no autenticado');
    const budgets = await this.budgetService.getSummary(req.user.id);
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
    const budgets = await this.budgetService.getHistory(req.user.id);
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
    const budget = await this.budgetService.getById(req.params.id, req.user.id);
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
    const dto: UpdateBudgetDto = req.body;
    const budget = await this.budgetService.update(req.params.id, dto, req.user.id);
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
    await this.budgetService.finalize(req.params.id, req.user.id);
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
    await this.budgetService.permanentDelete(req.params.id, req.user.id);
    sendSuccess(res, null, 200);
  }
}
