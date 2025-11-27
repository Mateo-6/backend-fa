import { CategoryRepository } from '../repositories/category.repository';
import { UserRepository } from '../../user/repositories/user.repository';
import { CreateCategoryDto } from '../../../application/dto/category/create-category.dto';
import { UpdateCategoryDto } from '../../../application/dto/category/update-category.dto';
import { Category } from '../types/category.types';
import { NotFoundError, ForbiddenError } from '../../errors/app-error';

export class CategoryService {
  /**
   * @param {CategoryRepository} categoryRepository Repository responsible for persistence.
   * @param {UserRepository} userRepository Repository used to validate the owner existence.
   */
  constructor(
    private readonly categoryRepository: CategoryRepository,
    private readonly userRepository: UserRepository
  ) {}

  /**
   * Creates a category after verifying the owner exists.
   *
   * @param {CreateCategoryDto} data Validated category payload.
   * @param {string} userId User identifier obtained from JWT token.
   * @returns {Promise<Category>} Newly created category.
   */
  async create(data: CreateCategoryDto, userId: string): Promise<Category> {
    await this.ensureUserExists(userId);
    return this.categoryRepository.create({ ...data, userId });
  }

  /**
   * Retrieves every category or filters by user when a user identifier is provided.
   *
   * @param {string | undefined} userId Optional owner identifier used for filtering.
   * @returns {Promise<Category[]>} Collection of categories.
   */
  async findAll(userId?: string): Promise<Category[]> {
    if (userId) {
      await this.ensureUserExists(userId);
      return this.categoryRepository.findAllByUser(userId);
    }

    return this.categoryRepository.findAll();
  }

  /**
   * Retrieves a single category by identifier.
   *
   * @param {string} id Category identifier.
   * @returns {Promise<Category | null>} Category when found or null.
   */
  async findById(id: string): Promise<Category | null> {
    return this.categoryRepository.findById(id);
  }

  /**
   * Updates the provided category identifier with the given payload.
   * Validates that the category belongs to the specified user.
   *
   * @param {string} id Category identifier.
   * @param {UpdateCategoryDto} data Partial payload with the updated fields.
   * @param {string} userId User identifier to verify ownership.
   * @returns {Promise<Category>} Updated category.
   * @throws {NotFoundError} If the category does not exist.
   * @throws {ForbiddenError} If the category does not belong to the user.
   */
  async update(id: string, data: UpdateCategoryDto, userId: string): Promise<Category> {
    await this.ensureCategoryOwnership(id, userId);
    const updatedCategory = await this.categoryRepository.update(id, data);
    if (!updatedCategory) {
      throw new NotFoundError('Category', id);
    }
    return updatedCategory;
  }

  /**
   * Deletes a category by identifier.
   * Validates that the category belongs to the specified user.
   *
   * @param {string} id Category identifier.
   * @param {string} userId User identifier to verify ownership.
   * @returns {Promise<void>} Resolves when deletion completes.
   * @throws {NotFoundError} If the category does not exist.
   * @throws {ForbiddenError} If the category does not belong to the user.
   */
  async delete(id: string, userId: string): Promise<void> {
    await this.ensureCategoryOwnership(id, userId);
    await this.categoryRepository.delete(id);
  }

  /**
   * Ensures the provided user identifier exists in the persistence layer.
   *
   * @param {string} userId Owner identifier.
   * @returns {Promise<void>} Resolves if the user exists, otherwise throws.
   */
  private async ensureUserExists(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User', userId);
    }
  }

  /**
   * Ensures the provided category belongs to the specified user.
   *
   * @param {string} categoryId Category identifier.
   * @param {string} userId User identifier to verify ownership.
   * @returns {Promise<Category>} The category if it belongs to the user.
   * @throws {NotFoundError} If the category does not exist.
   * @throws {ForbiddenError} If the category does not belong to the user.
   */
  private async ensureCategoryOwnership(categoryId: string, userId: string): Promise<Category> {
    const category = await this.categoryRepository.findById(categoryId);
    if (!category) {
      throw new NotFoundError('Category', categoryId);
    }
    if (category.userId !== userId) {
      throw new ForbiddenError('You do not have permission to access this category');
    }
    return category;
  }
}

