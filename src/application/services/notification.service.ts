import { UserRepository } from '../../domain/user/repositories/user.repository';
import { NotificationRepository, PaginatedNotifications, NotificationPaginationOptions } from '../../domain/notification/repositories/notification.repository';
import { RegisterPushTokenDto } from '../dto/notification/register-push-token.dto';
import { NotFoundError, ForbiddenError } from '../../domain/errors/app-error';
import { User } from '../../domain/user/types/user.types';
import { Notification } from '../../domain/notification/types/notification.types';

/**
 * Service for managing push notifications and inbox notifications.
 * Orchestrates notification use cases and coordinates repositories.
 */
export class NotificationService {
  /**
   * @param {UserRepository} userRepository Repository implementation handling user persistence.
   * @param {NotificationRepository} notificationRepository Repository implementation handling notification persistence.
   */
  constructor(
    private userRepository: UserRepository,
    private notificationRepository: NotificationRepository
  ) {}

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

  /**
   * Retrieves paginated notifications for a user, ordered by createdAt descending.
   *
   * @param {string} userId User identifier.
   * @param {NotificationPaginationOptions} options Pagination options (limit and offset).
   * @returns {Promise<PaginatedNotifications>} Paginated notifications with metadata.
   */
  async getNotifications(
    userId: string,
    options?: NotificationPaginationOptions
  ): Promise<PaginatedNotifications> {
    return this.notificationRepository.findAllByUser(userId, options);
  }

  /**
   * Marks a notification as read.
   * Validates that the notification belongs to the user.
   *
   * @param {string} notificationId Notification identifier.
   * @param {string} userId User identifier for ownership validation.
   * @returns {Promise<Notification>} Updated notification.
   * @throws {NotFoundError} If the notification does not exist.
   * @throws {ForbiddenError} If the notification does not belong to the user.
   */
  async markNotificationAsRead(notificationId: string, userId: string): Promise<Notification> {
    const notification = await this.notificationRepository.findById(notificationId);

    if (!notification) {
      throw new NotFoundError('Notification', notificationId);
    }

    if (notification.userId !== userId) {
      throw new ForbiddenError('This notification does not belong to you');
    }

    const updatedNotification = await this.notificationRepository.updateReadStatus(notificationId, true);

    if (!updatedNotification) {
      throw new NotFoundError('Notification', notificationId);
    }

    return updatedNotification;
  }

  /**
   * Gets the count of unread notifications for a user.
   *
   * @param {string} userId User identifier.
   * @returns {Promise<number>} Count of unread notifications.
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepository.countUnreadByUser(userId);
  }
}

