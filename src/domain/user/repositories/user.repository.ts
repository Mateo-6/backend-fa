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
}