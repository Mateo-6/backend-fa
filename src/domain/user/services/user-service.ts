import { UserRepository } from "../repositories/user.repository";
import { User } from "../types/user.types";
import { CreateUserDto } from "../../../application/dto/user/create-user.dto";

import * as bcrypt from 'bcrypt';

export class UserService {
  constructor(private userRepository: UserRepository) { }

  async create(data: CreateUserDto): Promise<User> {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const userWithHashedPassword = { ...data, password: hashedPassword };
    return this.userRepository.create(userWithHashedPassword);
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.findAll();
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findById(id);
  }
}