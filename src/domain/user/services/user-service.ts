import { UserRepository } from "../repositories/user.repository";
import { User } from "../types/user.types";
import { CreateUserDto } from "../../../application/dto/user/create-user.dto";
import { IPasswordService } from "../../auth/services/password-service.interface";

export class UserService {
  /**
   * @param {UserRepository} userRepository Repository implementation handling persistence.
   * @param {IPasswordService} passwordService Service for password hashing.
   */
  constructor(
    private userRepository: UserRepository,
    private passwordService: IPasswordService
  ) {}

  /**
   * Creates a user after hashing the provided password.
   *
   * @param {CreateUserDto} data Raw user data coming from the controller.
   * @returns {Promise<User>} Persisted user entity.
   */
  async create(data: CreateUserDto): Promise<User> {
    const hashedPassword = await this.passwordService.hash(data.password!);
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