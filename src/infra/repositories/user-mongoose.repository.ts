import { User } from '../../domain/user/types/user.types';
import { UserRepository } from '../../domain/user/repositories/user.repository';
import { UserModel, IUserDocument } from '../database/models/user.model';
import { getMongooseInstance } from '../database/mongoose-client';

export class UserMongooseRepository implements UserRepository {
  async create(user: User): Promise<User> {
    // Ensure Mongoose is connected
    await getMongooseInstance();

    const createdUser: User = await UserModel.create(user);
    return createdUser;
  }

  async findAll(): Promise<User[]> {
    // Ensure Mongoose is connected
    await getMongooseInstance();

    const users: User[] = await UserModel.find()
      .sort({ createdAt: -1 }) // Sort by createdAt descending
      .exec();

    return users.map(user => user);
  }

  async findById(id: string): Promise<User | null> {
    // Ensure Mongoose is connected
    await getMongooseInstance();

    const user: IUserDocument | null = await UserModel.findById(id).exec();

    if (!user) {
      return null;
    }

    return user;
  }
}

