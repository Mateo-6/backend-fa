import { UserWithId } from '../../../domain/user/types/user.types';
import { IUserDocument } from '../../database/models/user.model';

/**
 * Mapper to convert between different User representations
 * Centralizes all conversion logic to avoid duplication
 */
export class UserMapper {
  /**
   * Converts a Mongoose document to UserWithId
   */
  static fromMongooseDocument(doc: IUserDocument): UserWithId {
    return {
      id: doc._id.toString(),
      username: doc.username,
      name: doc.name,
      email: doc.email,
      password: doc.password,
      phone: doc.phone,
    };
  }

  /**
   * Converts UserWithId to a plain object for persistence in Mongoose
   */
  static toMongooseData(user: UserWithId): Partial<IUserDocument> {
    return {
      _id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      password: user.password,
      phone: user.phone,
    };
  }
}

