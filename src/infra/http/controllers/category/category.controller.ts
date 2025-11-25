import { Request, Response } from 'express';
import { CategoryService } from '../../../../domain/category/services/category-service';
import { CreateCategoryDto } from '../../../../application/dto/category/create-category.dto';
import { UpdateCategoryDto } from '../../../../application/dto/category/update-category.dto';

export class CategoryController {
  /**
   * @param {CategoryService} categoryService Service encapsulating category business logic.
   */
  constructor(private readonly categoryService: CategoryService) {}

  /**
   * Creates a new category using the provided payload.
   *
   * @param {Request} req Express request whose body contains the validated payload.
   * @param {Response} res Express response used to send the category.
   * @returns {Promise<void>} Resolves when the response is dispatched.
   */
  public async create(req: Request, res: Response): Promise<void> {
    const createCategoryDto: CreateCategoryDto = req.body;
    const category = await this.categoryService.create(createCategoryDto);
    res.status(201).json(category);
  }

  /**
   * Retrieves every category or filters by user identifier when provided as a query parameter.
   *
   * @param {Request} req Express request optionally containing the userId query.
   * @param {Response} res Express response used to send the category collection.
   * @returns {Promise<void>} Resolves when the response is dispatched.
   */
  public async getAll(req: Request, res: Response): Promise<void> {
    const userId = typeof req.query.userId === 'string' ? req.query.userId : undefined;
    const categories = await this.categoryService.findAll(userId);
    res.json(categories);
  }

  /**
   * Retrieves a single category.
   *
   * @param {Request} req Express request containing the identifier parameter.
   * @param {Response} res Express response used to send the category.
   * @returns {Promise<void>} Resolves when the response is dispatched.
   */
  public async getById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const category = await this.categoryService.findById(id);
    if (!category) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }
    res.json(category);
  }

  /**
   * Updates an existing category.
   *
   * @param {Request} req Express request containing the identifier parameter and validated body.
   * @param {Response} res Express response used to send the updated category.
   * @returns {Promise<void>} Resolves when the response is dispatched.
   */
  public async update(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const updateCategoryDto: UpdateCategoryDto = req.body;
    const category = await this.categoryService.update(id, updateCategoryDto);
    if (!category) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }
    res.json(category);
  }

  /**
   * Deletes a category by identifier.
   *
   * @param {Request} req Express request containing the identifier parameter.
   * @param {Response} res Express response used to send the confirmation.
   * @returns {Promise<void>} Resolves when the response is dispatched.
   */
  public async delete(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    await this.categoryService.delete(id);
    res.status(204).send();
  }
}

