import { UserRepository } from "../repositories/user.repository";
import { User } from "../types/user.types";
import { CreateUserDto } from "../../../application/dto/user/create-user.dto";

import * as bcrypt from 'bcrypt';

export class UserService {
  /**
   * @param {UserRepository} userRepository Repository implementation handling persistence.
   */
  constructor(private userRepository: UserRepository) { }

  /**
   * Creates a user after hashing the provided password.
   *
   * @param {CreateUserDto} data Raw user data coming from the controller.
   * @returns {Promise<User>} Persisted user entity.
   */
  async create(data: CreateUserDto): Promise<User> {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const userWithHashedPassword = { ...data, password: hashedPassword };
    return this.userRepository.create(userWithHashedPassword);
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
}