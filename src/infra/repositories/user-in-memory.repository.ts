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

  /**
   * Looks up a user entity by email within the in-memory collection.
   *
   * @param {string} email Email address to search.
   * @returns {Promise<User | null>} Matching user or null.
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.users.find((user) => user.email === email) || null;
  }

  /**
   * Updates an existing user in the in-memory collection.
   *
   * @param {string} id User identifier.
   * @param {Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>} data Fields to update.
   * @returns {Promise<User | null>} Updated user or null when missing.
   */
  async update(id: string, data: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>): Promise<User | null> {
    const userIndex = this.users.findIndex((user) => user.id === id);
    if (userIndex === -1) {
      return null;
    }

    const existingUser = this.users[userIndex];
    const updatedUser: User = {
      ...existingUser,
      ...data,
      id: existingUser.id,
      updatedAt: new Date(),
    };

    this.users[userIndex] = updatedUser;
    return updatedUser;
  }

  /**
   * Removes a user from the in-memory collection.
   *
   * @param {string} id User identifier.
   * @returns {Promise<void>} Resolves when the user is deleted.
   */
  async delete(id: string): Promise<void> {
    const userIndex = this.users.findIndex((user) => user.id === id);
    if (userIndex !== -1) {
      this.users.splice(userIndex, 1);
    }
  }

  /**
   * Adds a push token to the user's expoPushTokens array, avoiding duplicates.
   *
   * @param {string} id User identifier.
   * @param {string} token Expo push token to add.
   * @returns {Promise<User | null>} Updated user or null if not found.
   */
  async addPushToken(id: string, token: string): Promise<User | null> {
    const userIndex = this.users.findIndex((user) => user.id === id);
    if (userIndex === -1) {
      return null;
    }

    const existingUser = this.users[userIndex];
    const currentTokens = (existingUser as any).expoPushTokens || [];
    
    // Use Set to avoid duplicates (similar to $addToSet behavior)
    const tokenSet = new Set([...currentTokens, token]);
    const updatedTokens = Array.from(tokenSet);

    const updatedUser = {
      ...existingUser,
      expoPushTokens: updatedTokens,
      updatedAt: new Date(),
    } as User;

    this.users[userIndex] = updatedUser;
    return updatedUser;
  }
}