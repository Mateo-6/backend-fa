import {
  NotificationRepository,
  NotificationPaginationOptions,
  PaginatedNotifications,
} from '../../domain/notification/repositories/notification.repository';
import { Notification } from '../../domain/notification/types/notification.types';
import { NotificationModel, INotificationDocument } from '../database/models/notification.model';
import { getMongooseInstance } from '../database/mongoose-client';

/**
 * Mongoose implementation of NotificationRepository.
 */
export class NotificationMongooseRepository implements NotificationRepository {
  /**
   * Retrieves notifications for a user with pagination, ordered by createdAt descending.
   *
   * @param {string} userId Owner identifier.
   * @param {NotificationPaginationOptions} options Pagination options (limit and offset).
   * @returns {Promise<PaginatedNotifications>} Paginated notifications with metadata.
   */
  async findAllByUser(
    userId: string,
    options?: NotificationPaginationOptions
  ): Promise<PaginatedNotifications> {
    await getMongooseInstance();

    const limit = options?.limit ?? 20;
    const offset = options?.offset ?? 0;

    const query = { userId };

    const [notifications, total] = await Promise.all([
      NotificationModel.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .exec(),
      NotificationModel.countDocuments(query).exec(),
    ]);

    return {
      notifications: notifications.map((notification) => this.toDomain(notification)),
      total,
      limit,
      offset,
    };
  }

  /**
   * Finds a notification by identifier.
   *
   * @param {string} id Notification identifier.
   * @returns {Promise<Notification | null>} Matching notification or null.
   */
  async findById(id: string): Promise<Notification | null> {
    await getMongooseInstance();
    const notification = await NotificationModel.findById(id).exec();
    if (!notification) {
      return null;
    }
    return this.toDomain(notification);
  }

  /**
   * Counts unread notifications for a user.
   *
   * @param {string} userId Owner identifier.
   * @returns {Promise<number>} Count of unread notifications.
   */
  async countUnreadByUser(userId: string): Promise<number> {
    await getMongooseInstance();
    return NotificationModel.countDocuments({ userId, isRead: false }).exec();
  }

  /**
   * Updates the isRead status of a notification.
   *
   * @param {string} id Notification identifier.
   * @param {boolean} isRead Read status to set.
   * @returns {Promise<Notification | null>} Updated notification or null when missing.
   */
  async updateReadStatus(id: string, isRead: boolean): Promise<Notification | null> {
    await getMongooseInstance();
    const notification = await NotificationModel.findByIdAndUpdate(
      id,
      { $set: { isRead } },
      { new: true }
    ).exec();
    if (!notification) {
      return null;
    }
    return this.toDomain(notification);
  }

  /**
   * Maps a mongoose document to the domain type.
   *
   * @param {INotificationDocument} doc Mongoose document.
   * @returns {Notification} Domain notification.
   */
  private toDomain(doc: INotificationDocument): Notification {
    return {
      id: doc.id,
      userId: doc.userId,
      title: doc.title,
      body: doc.body,
      priority: doc.priority,
      isRead: doc.isRead,
      metadata: doc.metadata || {},
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}

