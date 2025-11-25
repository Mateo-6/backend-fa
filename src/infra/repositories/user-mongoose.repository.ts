import { UserWithId } from '../../domain/user/types/user.types';
import { UserRepository } from '../../domain/user/repositories/user.repository';
import { UserModel } from '../database/models/user.model';
import { getMongooseInstance } from '../database/mongoose-client';
import { UserMapper } from './mappers/user.mapper';

export class UserMongooseRepository implements UserRepository {
  async create(user: UserWithId): Promise<UserWithId> {
    // Ensure Mongoose is connected
    await getMongooseInstance();

    const userData = UserMapper.toMongooseData(user);
    const createdUser = await UserModel.create(userData);

    return UserMapper.fromMongooseDocument(createdUser);
  }

  async findAll(): Promise<UserWithId[]> {
    // Ensure Mongoose is connected
    await getMongooseInstance();

    const users = await UserModel.find()
      .sort({ createdAt: -1 }) // Sort by createdAt descending
      .exec();

    return users.map(user => UserMapper.fromMongooseDocument(user));
  }

  async findById(id: string): Promise<UserWithId | null> {
    // Ensure Mongoose is connected
    await getMongooseInstance();

    const user = await UserModel.findById(id).exec();

    if (!user) {
      return null;
    }

    return UserMapper.fromMongooseDocument(user);
  }
}

