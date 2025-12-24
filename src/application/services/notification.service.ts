import { UserRepository } from '../../domain/user/repositories/user.repository';
import { RegisterPushTokenDto } from '../dto/notification/register-push-token.dto';
import { NotFoundError } from '../../domain/errors/app-error';
import { User } from '../../domain/user/types/user.types';

/**
 * Service for managing push notifications.
 * Orchestrates notification use cases and coordinates repositories.
 */
export class NotificationService {
  /**
   * @param {UserRepository} userRepository Repository implementation handling user persistence.
   */
  constructor(private userRepository: UserRepository) {}

  /**
   * Registers an Expo push token for a user.
   * Uses $addToSet to prevent duplicate tokens in the array.
   *
   * @param {string} userId User identifier.
   * @param {RegisterPushTokenDto} data Push token data.
   * @returns {Promise<User>} Updated user with the new token added.
   * @throws {NotFoundError} If the user does not exist.
   */
  async registerPushToken(userId: string, data: RegisterPushTokenDto): Promise<User> {
    const updatedUser = await this.userRepository.addPushToken(userId, data.token);
    
    if (!updatedUser) {
      throw new NotFoundError('User', userId);
    }

    return updatedUser;
  }
}

