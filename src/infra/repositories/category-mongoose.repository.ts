import { CategoryRepository } from '../../domain/category/repositories/category.repository';
import { Category, CategoryType } from '../../domain/category/types/category.types';
import { CategoryModel, ICategoryDocument } from '../database/models/category.model';
import { getMongooseInstance } from '../database/mongoose-client';
import { UserModel } from '../database/models/user.model';
import { sanitizeStringValue } from '../utils/sanitize-query';

export class CategoryMongooseRepository implements CategoryRepository {
  /**
   * Persists a category document.
   *
   * @param {Category} category Category payload containing the owner reference.
   * @returns {Promise<Category>} Created category mapped to the domain type.
   */
  async create(category: Category): Promise<Category> {
    await getMongooseInstance();
    const createdCategory = await CategoryModel.create({
      name: category.name,
      description: category.description,
      type: category.type,
      user: category.userId,
    });
    await UserModel.findByIdAndUpdate(createdCategory.user, {
      $addToSet: { categories: createdCategory._id },
    }).exec();
    return this.toDomain(createdCategory);
  }

  /**
   * Retrieves every stored category sorted by most recent creation date.
   *
   * @returns {Promise<Category[]>} Collection of categories.
   */
  async findAll(): Promise<Category[]> {
    await getMongooseInstance();
    const categories = await CategoryModel.find({ deletedAt: null }).sort({ createdAt: -1 }).exec();
    return categories.map((category) => this.toDomain(category));
  }

  /**
   * Retrieves the categories that belong to the provided user.
   * Optionally filters by category type.
   *
   * @param {string} userId Owner identifier.
   * @param {CategoryType | undefined} type Optional category type filter (income or expense).
   * @returns {Promise<Category[]>} Categories tied to the user.
   */
  async findAllByUser(userId: string, type?: CategoryType): Promise<Category[]> {
    await getMongooseInstance();
    const query: Record<string, unknown> = { user: userId, deletedAt: null };
    if (type) {
      query.type = sanitizeStringValue(type);
    }
    const categories = await CategoryModel.find(query).sort({ createdAt: -1 }).exec();
    return categories.map((category) => this.toDomain(category));
  }

  /**
   * Retrieves a single category by identifier.
   *
   * @param {string} id Category identifier.
   * @returns {Promise<Category | null>} Matching category or null.
   */
  async findById(id: string): Promise<Category | null> {
    await getMongooseInstance();
    const category = await CategoryModel.findOne({ _id: id, deletedAt: null }).exec();
    if (!category) {
      return null;
    }
    return this.toDomain(category);
  }

  /**
   * Updates a category using the provided payload.
   *
   * @param {string} id Category identifier.
   * @param {Partial<Omit<Category, 'id'>>} data Fields to update.
   * @returns {Promise<Category | null>} Updated category or null when missing.
   */
  async update(id: string, data: Partial<Omit<Category, 'id'>>): Promise<Category | null> {
    await getMongooseInstance();
    const mappedData: Record<string, unknown> = {};
    if (typeof data.name === 'string') {
      mappedData.name = data.name;
    }
    if (typeof data.description === 'string') {
      mappedData.description = data.description;
    }
    if (typeof data.type === 'string') {
      mappedData.type = data.type;
    }
    const category = await CategoryModel.findByIdAndUpdate(
      id,
      { $set: mappedData },
      { new: true }
    ).exec();
    if (!category) {
      return null;
    }
    return this.toDomain(category);
  }

  /**
   * Deletes a category by identifier.
   *
   * @param {string} id Category identifier.
   * @returns {Promise<void>} Resolves when the document is deleted.
   */
  async delete(id: string): Promise<void> {
    await getMongooseInstance();
    const category = await CategoryModel.findOne({ _id: id, deletedAt: null }).exec();
    if (!category) {
      return;
    }
    await CategoryModel.updateOne({ _id: id }, { $set: { deletedAt: new Date() } }).exec();
    await UserModel.findByIdAndUpdate(category.user, {
      $pull: { categories: category._id },
    }).exec();
  }

  /**
   * Maps a mongoose document to the domain type.
   *
   * @param {ICategoryDocument} doc Mongoose document.
   * @returns {Category} Domain category.
   */
  private toDomain(doc: ICategoryDocument): Category {
    return {
      id: doc.id,
      name: doc.name,
      description: doc.description ?? undefined,
      type: doc.type,
      userId: doc.user.toString(),
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      deletedAt: doc.deletedAt ?? null,
    };
  }
}

