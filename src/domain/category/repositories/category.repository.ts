import { Category } from '../types/category.types';

export interface CategoryRepository {
  /**
   * Persists a new category.
   *
   * @param {Category} category Category data to persist.
   * @returns {Promise<Category>} Stored category.
   */
  create(category: Category): Promise<Category>;

  /**
   * Retrieves every persisted category.
   *
   * @returns {Promise<Category[]>} Collection of categories.
   */
  findAll(): Promise<Category[]>;

  /**
   * Retrieves every category associated with the provided user.
   *
   * @param {string} userId Owner identifier.
   * @returns {Promise<Category[]>} Collection of categories belonging to the user.
   */
  findAllByUser(userId: string): Promise<Category[]>;

  /**
   * Finds a category by identifier.
   *
   * @param {string} id Category identifier.
   * @returns {Promise<Category | null>} Matching category or null.
   */
  findById(id: string): Promise<Category | null>;

  /**
   * Updates an existing category with the provided partial payload.
   *
   * @param {string} id Category identifier.
   * @param {Partial<Omit<Category, 'id'>>} data Fields to update.
   * @returns {Promise<Category | null>} Updated category or null when missing.
   */
  update(id: string, data: Partial<Omit<Category, 'id'>>): Promise<Category | null>;

  /**
   * Removes a category by identifier.
   *
   * @param {string} id Category identifier.
   * @returns {Promise<void>} Resolves once the category is deleted.
   */
  delete(id: string): Promise<void>;
}

