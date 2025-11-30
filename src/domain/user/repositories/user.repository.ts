import { User } from "../types/user.types";

export interface UserRepository {
  /**
   * Persists a new user entity.
   *
   * @param {User} user User entity to persist.
   * @returns {Promise<User>} The persisted user.
   */
  create(user: User): Promise<User>;

  /**
   * Retrieves all persisted users.
   *
   * @returns {Promise<User[]>} Collection of stored users.
   */
  findAll(): Promise<User[]>;

  /**
   * Finds a user by its identifier or returns null if not found.
   *
   * @param {string} id Identifier of the desired user.
   * @returns {Promise<User | null>} The located user or null.
   */
  findById(id: string): Promise<User | null>;

  /**
   * Finds a user by its email address or returns null if not found.
   *
   * @param {string} email Email address of the desired user.
   * @returns {Promise<User | null>} The located user or null.
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Updates an existing user with the provided data.
   *
   * @param {string} id Identifier of the user to update.
   * @param {Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>} data Partial user data to update.
   * @returns {Promise<User | null>} The updated user or null if not found.
   */
  update(id: string, data: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>): Promise<User | null>;

  /**
   * Deletes a user by its identifier.
   *
   * @param {string} id Identifier of the user to delete.
   * @returns {Promise<void>} Resolves when the user is deleted.
   */
  delete(id: string): Promise<void>;
}