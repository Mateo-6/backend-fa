import { UserRepository } from "../repositories/user.repository";
import { User } from "../entities/user";
import { v4 as uuidv4 } from 'uuid';
import { CreateUserDto } from "../../../application/dto/user/create-user.dto";

export class UserService {
  constructor(private userRepository: UserRepository) {}

  async create(data: CreateUserDto): Promise<User> {
    const user = new User(uuidv4(), data.name, data.email, data.age);
    return this.userRepository.create(user);
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.findAll();
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findById(id);
  }
}