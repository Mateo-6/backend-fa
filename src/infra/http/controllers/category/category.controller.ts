import { param } from '../../utils/param.util';
import { Response } from 'express';
import { CategoryService } from '../../../../application/services/category.service';
import { CreateCategoryDto } from '../../../../application/dto/category/create-category.dto';
import { UpdateCategoryDto } from '../../../../application/dto/category/update-category.dto';
import { AuthenticatedRequest } from '../../types/request.types';
import { UnauthorizedError, NotFoundError } from '../../../../domain/errors/app-error';
import { sendSuccess } from '../../utils/response.util';
import { logger } from '../../../utils/logger';

export class CategoryController {
  /**
   * @param {CategoryService} categoryService Service encapsulating category business logic.
   */
  constructor(private readonly categoryService: CategoryService) {}

  /**
   * Creates a new category using the provided payload.
   * The userId is obtained from the JWT token (authenticated user).
   *
   * @param {AuthenticatedRequest} req Express request whose body contains the validated payload and user from JWT.
   * @param {Response} res Express response used to send the category.
   * @returns {Promise<void>} Resolves when the response is dispatched.
   */
  public async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user?.id) throw new UnauthorizedError('Usuario no autenticado');

    const { requestId, user } = req;
    const createCategoryDto: CreateCategoryDto = req.body;

    logger.info('Creating category', { requestId, userId: user.id, name: createCategoryDto.name });
    const category = await this.categoryService.create(createCategoryDto, user.id);
    logger.info('Category created', { requestId, userId: user.id, categoryId: category.id });
    sendSuccess(res, category, 201);
  }

  /**
   * Retrieves every category for the authenticated user.
   * The userId is obtained from the JWT token.
   * Optionally filters categories by type (income or expense).
   *
   * @param {AuthenticatedRequest} req Express request containing the authenticated user from JWT and optional type query parameter.
   * @param {Response} res Express response used to send the category collection.
   * @returns {Promise<void>} Resolves when the response is dispatched.
   */
  public async getAll(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user?.id) throw new UnauthorizedError('Usuario no autenticado');

    const { requestId, user } = req;
    const type = req.query.type as string | undefined;

    logger.info('Fetching categories', { requestId, userId: user.id, type });
    const categories = await this.categoryService.findAll(user.id, type);
    sendSuccess(res, categories);
  }

  /**
   * Retrieves a single category.
   *
   * @param {AuthenticatedRequest} req Express request containing the identifier parameter.
   * @param {Response} res Express response used to send the category.
   * @returns {Promise<void>} Resolves when the response is dispatched.
   */
  public async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { requestId } = req;
    const id = param(req, 'id');

    logger.info('Fetching category by ID', { requestId, categoryId: id });
    const category = await this.categoryService.findById(id);
    if (!category) throw new NotFoundError('Category', id);
    sendSuccess(res, category);
  }

  /**
   * Updates an existing category.
   * Validates that the category belongs to the authenticated user.
   *
   * @param {AuthenticatedRequest} req Express request containing the identifier parameter and validated body.
   * @param {Response} res Express response used to send the updated category.
   * @returns {Promise<void>} Resolves when the response is dispatched.
   */
  public async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user?.id) throw new UnauthorizedError('Usuario no autenticado');

    const { requestId, user } = req;
    const id = param(req, 'id');
    const updateCategoryDto: UpdateCategoryDto = req.body;

    logger.info('Updating category', { requestId, userId: user.id, categoryId: id });
    const category = await this.categoryService.update(id, updateCategoryDto, user.id);
    sendSuccess(res, category);
  }

  /**
   * Deletes a category by identifier.
   * Validates that the category belongs to the authenticated user.
   *
   * @param {AuthenticatedRequest} req Express request containing the identifier parameter.
   * @param {Response} res Express response used to send the confirmation.
   * @returns {Promise<void>} Resolves when the response is dispatched.
   */
  public async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user?.id) throw new UnauthorizedError('Usuario no autenticado');

    const { requestId, user } = req;
    const id = param(req, 'id');

    logger.info('Deleting category', { requestId, userId: user.id, categoryId: id });
    await this.categoryService.delete(id, user.id);
    sendSuccess(res, null, 204);
  }
}
