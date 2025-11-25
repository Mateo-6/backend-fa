import { UserWithId } from "../../domain/user/types/user.types";
import { UserRepository } from "../../domain/user/repositories/user.repository";

export class UserInMemoryRepository implements UserRepository {
  private users: UserWithId[] = [];

  async create(user: UserWithId): Promise<UserWithId> {
    this.users.push(user);
    return user;
  }

  async findAll(): Promise<UserWithId[]> {
    return this.users;
  }

  async findById(id: string): Promise<UserWithId | null> {
    return this.users.find((user) => user.id === id) || null;
  }
}