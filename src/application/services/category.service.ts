import { CategoryRepository } from '../../domain/category/repositories/category.repository';
import { UserRepository } from '../../domain/user/repositories/user.repository';
import { CreateCategoryDto } from '../dto/category/create-category.dto';
import { UpdateCategoryDto } from '../dto/category/update-category.dto';
import { Category, CategoryType } from '../../domain/category/types/category.types';
import { NotFoundError, ForbiddenError } from '../../domain/errors/app-error';
import { redisCacheService, RedisCacheService } from '../../infra/services/redis-cache.service';

/**
 * Service for managing categories.
 * Orchestrates category use cases, validates authorization, and coordinates repositories.
 */
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
    const category = await this.categoryRepository.create({ ...data, userId });
    redisCacheService.del(RedisCacheService.categoriesKey(userId)).catch(() => {});
    return category;
  }

  /**
   * Retrieves every category or filters by user when a user identifier is provided.
   * Optionally filters by category type (income or expense).
   *
   * @param {string | undefined} userId Optional owner identifier used for filtering.
   * @param {string | undefined} type Optional category type filter (income or expense).
   * @returns {Promise<Category[]>} Collection of categories.
   */
  async findAll(userId?: string, type?: string): Promise<Category[]> {
    if (userId) {
      await this.ensureUserExists(userId);
      const categoryType = type ? this.validateCategoryType(type) : undefined;
      return this.categoryRepository.findAllByUser(userId, categoryType);
    }

    return this.categoryRepository.findAll();
  }

  /**
   * Validates and converts a string to CategoryType enum value.
   *
   * @param {string} type String representation of category type.
   * @returns {CategoryType | undefined} Valid CategoryType or undefined if invalid.
   */
  private validateCategoryType(type: string): CategoryType | undefined {
    const normalizedType = type.toLowerCase();
    if (normalizedType === CategoryType.INCOME || normalizedType === CategoryType.EXPENSE) {
      return normalizedType as CategoryType;
    }
    return undefined;
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
    redisCacheService.del(RedisCacheService.categoriesKey(userId)).catch(() => {});
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
    redisCacheService.del(RedisCacheService.categoriesKey(userId)).catch(() => {});
  }

  /**
   * Ensures the provided user identifier exists in the persistence layer.
   *
   * @param {string} userId Owner identifier.
   * @returns {Promise<void>} Resolves if the user exists, otherwise throws.
   * @throws {NotFoundError} If the user does not exist.
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
      throw new ForbiddenError('No tienes permiso para acceder a esta categoría');
    }
    return category;
  }
}

