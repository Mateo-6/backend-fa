import { User } from '../../domain/user/types/user.types';
import { UserRepository } from '../../domain/user/repositories/user.repository';
import { UserModel, IUserDocument } from '../database/models/user.model';
import { getMongooseInstance } from '../database/mongoose-client';
import { NotFoundError } from '../../domain/errors/app-error';

export class UserMongooseRepository implements UserRepository {
  /**
   * Persists a user document in MongoDB.
   *
   * @param {User} user User entity to persist.
   * @returns {Promise<User>} The stored user document.
   */
  async create(user: User): Promise<User> {
    // Ensure Mongoose is connected
    await getMongooseInstance();

    const createdUser: IUserDocument = await UserModel.create(user);

    return this.toDomain(createdUser);
  }

  /**
   * Retrieves every user document from MongoDB sorted by creation date.
   *
   * @returns {Promise<User[]>} Ordered list of users.
   */
  async findAll(): Promise<User[]> {
    // Ensure Mongoose is connected
    await getMongooseInstance();

    const users: IUserDocument[] = await UserModel.find()
      .sort({ createdAt: -1 }) // Sort by createdAt descending
      .exec();

    return users.map(user => this.toDomain(user));
  }

  /**
   * Finds a user document by its MongoDB identifier.
   *
   * @param {string} id MongoDB identifier.
   * @returns {Promise<User | null>} Matching user or null.
   */
  async findById(id: string): Promise<User | null> {
    // Ensure Mongoose is connected
    await getMongooseInstance();

    const user: IUserDocument | null = await UserModel.findById(id).exec();

    if (!user) {
      throw new NotFoundError('User', id);
    }

    return this.toDomain(user);
  }

  /**
   * Finds a user document by its email address.
   *
   * @param {string} email Email address of the user.
   * @returns {Promise<User | null>} Matching user or null.
   */
  async findByEmail(email: string): Promise<User | null> {
    // Ensure Mongoose is connected
    await getMongooseInstance();

    const user: IUserDocument | null = await UserModel.findOne({ email }).exec();

    if (!user) {
      return null;
    }

    return this.toDomainWithPassword(user);
  }

  /**
  * Maps a mongoose document to the domain type.
  *
  * @param {IUserDocument} doc Mongoose document.
  * @returns {User} Domain user.
  */
  private toDomain(doc: IUserDocument): User {
    return {
      id: doc.id,
      username: doc.username,
      name: doc.name,
      phone: doc.phone,
      email: doc.email,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    };
  }

  /**
   * Maps a mongoose document to the domain type with password.
   *
   * @param {IUserDocument} doc Mongoose document.
   * @returns {User} Domain user with password.
   */
  private toDomainWithPassword(doc: IUserDocument): User {
    return {
      id: doc.id,
      username: doc.username,
      name: doc.name,
      phone: doc.phone,
      email: doc.email,
      password: doc.password,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    };
  }

  /**
   * Updates a user using the provided payload.
   *
   * @param {string} id User identifier.
   * @param {Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>} data Fields to update.
   * @returns {Promise<User | null>} Updated user or null when missing.
   */
  async update(id: string, data: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>): Promise<User | null> {
    // Ensure Mongoose is connected
    await getMongooseInstance();

    const mappedData: Record<string, unknown> = data;

    const user = await UserModel.findByIdAndUpdate(
      id,
      { $set: mappedData },
      { new: true }
    ).exec();

    if (!user) {
      return null;
    }

    return this.toDomain(user);
  }

  /**
   * Deletes a user by identifier.
   *
   * @param {string} id User identifier.
   * @returns {Promise<void>} Resolves when the document is deleted.
   */
  async delete(id: string): Promise<void> {
    // Ensure Mongoose is connected
    await getMongooseInstance();

    await UserModel.findByIdAndDelete(id).exec();
  }
}