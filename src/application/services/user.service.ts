import { UserRepository } from '../../domain/user/repositories/user.repository';
import { User } from '../../domain/user/types/user.types';
import { CreateUserDto } from '../dto/user/create-user.dto';
import { UpdateUserDto } from '../dto/user/update-user.dto';
import { IPasswordService } from '../../domain/auth/services/password-service.interface';
import { CategoryRepository } from '../../domain/category/repositories/category.repository';
import { NotFoundError } from '../../domain/errors/app-error';
import { DEFAULT_CATEGORIES } from '../constants/default-categories';

/**
 * Service for managing users.
 * Orchestrates user use cases and coordinates repositories.
 */
export class UserService {
  /**
   * @param {UserRepository} userRepository Repository implementation handling persistence.
   * @param {IPasswordService} passwordService Service for password hashing.
   * @param {CategoryRepository} categoryRepository Repository for creating default categories on registration.
   */
  constructor(
    private userRepository: UserRepository,
    private passwordService: IPasswordService,
    private categoryRepository: CategoryRepository
  ) {}

  /**
   * Creates a user after hashing the provided password and assigns default categories.
   *
   * @param {CreateUserDto} data Raw user data coming from the controller.
   * @returns {Promise<User>} Persisted user entity.
   */
  async create(data: CreateUserDto): Promise<User> {
    const hashedPassword = await this.passwordService.hash(data.password!);
    const userWithHashedPassword = { ...data, password: hashedPassword };
    const user = await this.userRepository.create(userWithHashedPassword);
    await this.createDefaultCategoriesForUser(user.id!);
    return user;
  }

  /**
   * Creates the default categories (income and expense) for a newly registered user.
   *
   * @param {string} userId Owner identifier.
   * @returns {Promise<void>} Resolves when all default categories are created.
   */
  private async createDefaultCategoriesForUser(userId: string): Promise<void> {
    for (const entry of DEFAULT_CATEGORIES) {
      await this.categoryRepository.create({
        name: entry.name,
        description: entry.description,
        type: entry.type,
        userId,
      });
    }
  }

  /**
   * Retrieves every user from the configured repository implementation.
   *
   * @returns {Promise<User[]>} List of users.
   */
  async findAll(): Promise<User[]> {
    return this.userRepository.findAll();
  }

  /**
   * Retrieves a single user by the provided identifier.
   *
   * @param {string} id Identifier of the user to fetch.
   * @returns {Promise<User | null>} The user if found, otherwise null.
   */
  async findById(id: string): Promise<User | null> {
    return this.userRepository.findById(id);
  }

  /**
   * Updates an existing user with the provided data.
   *
   * @param {string} id User identifier.
   * @param {UpdateUserDto} data Partial payload with the updated fields.
   * @returns {Promise<User>} Updated user.
   * @throws {NotFoundError} If the user does not exist.
   */
  async update(id: string, data: UpdateUserDto): Promise<User> {
    const updatedUser = await this.userRepository.update(id, data);
    if (!updatedUser) {
      throw new NotFoundError('User', id);
    }
    return updatedUser;
  }

  /**
   * Deletes a user by identifier.
   *
   * @param {string} id User identifier.
   * @returns {Promise<void>} Resolves when deletion completes.
   * @throws {NotFoundError} If the user does not exist.
   */
  async delete(id: string): Promise<void> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundError('User', id);
    }
    await this.userRepository.delete(id);
  }
}

