import { UserWithId } from "../types/user.types";

export interface UserRepository {
  create(user: UserWithId): Promise<UserWithId>;
  findAll(): Promise<UserWithId[]>;
  findById(id: string): Promise<UserWithId | null>;
}