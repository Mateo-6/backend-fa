import { UserRepository } from "../repositories/user.repository";
import { UserWithId } from "../types/user.types";
import { v4 as uuidv4 } from 'uuid';
import { CreateUserDto } from "../../../application/dto/user/create-user.dto";

export class UserService {
  constructor(private userRepository: UserRepository) {}

  async create(data: CreateUserDto): Promise<UserWithId> {
    const user: UserWithId = {
      id: uuidv4(),
      username: data.username,
      name: data.name,
      email: data.email,
      password: data.password,
      phone: data.phone,
    };
    return this.userRepository.create(user);
  }

  async findAll(): Promise<UserWithId[]> {
    return this.userRepository.findAll();
  }

  async findById(id: string): Promise<UserWithId | null> {
    return this.userRepository.findById(id);
  }
}