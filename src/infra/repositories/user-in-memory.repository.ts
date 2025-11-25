import { User } from "../../domain/user/types/user.types";
import { UserRepository } from "../../domain/user/repositories/user.repository";

export class UserInMemoryRepository implements UserRepository {
  private users: User[] = [];

  async create(user: User): Promise<User> {
    this.users.push(user);
    return user;
  }

  async findAll(): Promise<User[]> {
    return this.users;
  }

  async findById(id: string): Promise<User | null> {
    return this.users.find((user) => user.id === id) || null;
  }
}