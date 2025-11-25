import { CategoryRepository } from '../repositories/category.repository';
import { UserRepository } from '../../user/repositories/user.repository';
import { CreateCategoryDto } from '../../../application/dto/category/create-category.dto';
import { UpdateCategoryDto } from '../../../application/dto/category/update-category.dto';
import { Category } from '../types/category.types';

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
   * @returns {Promise<Category>} Newly created category.
   */
  async create(data: CreateCategoryDto): Promise<Category> {
    await this.ensureUserExists(data.userId);
    return this.categoryRepository.create(data);
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
   *
   * @param {string} id Category identifier.
   * @param {UpdateCategoryDto} data Partial payload with the updated fields.
   * @returns {Promise<Category | null>} Updated category or null when it does not exist.
   */
  async update(id: string, data: UpdateCategoryDto): Promise<Category | null> {
    return this.categoryRepository.update(id, data);
  }

  /**
   * Deletes a category by identifier.
   *
   * @param {string} id Category identifier.
   * @returns {Promise<void>} Resolves when deletion completes.
   */
  async delete(id: string): Promise<void> {
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
      throw new Error('User not found');
    }
  }
}

