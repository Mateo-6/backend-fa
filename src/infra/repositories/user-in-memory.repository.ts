import { User } from "../../domain/user/types/user.types";
import { UserRepository } from "../../domain/user/repositories/user.repository";

export class UserInMemoryRepository implements UserRepository {
  private users: User[] = [];

  /**
   * Stores a user entity in memory.
   *
   * @param {User} user User entity to store.
   * @returns {Promise<User>} Stored user.
   */
  async create(user: User): Promise<User> {
    this.users.push(user);
    return user;
  }

  /**
   * Returns every in-memory user entity.
   *
   * @returns {Promise<User[]>} Collection of in-memory users.
   */
  async findAll(): Promise<User[]> {
    return this.users;
  }

  /**
   * Looks up a user entity by id within the in-memory collection.
   *
   * @param {string} id Identifier to search.
   * @returns {Promise<User | null>} Matching user or null.
   */
  async findById(id: string): Promise<User | null> {
    return this.users.find((user) => user.id === id) || null;
  }
}