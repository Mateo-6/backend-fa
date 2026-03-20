import { Notification } from '../types/notification.types';

/**
 * Pagination options for querying notifications.
 */
export interface NotificationPaginationOptions {
  limit?: number;
  offset?: number;
}

/**
 * Paginated result containing notifications and pagination metadata.
 */
export interface PaginatedNotifications {
  notifications: Notification[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Repository interface for Notification persistence operations.
 */
export interface NotificationRepository {
  /**
   * Persists a new notification.
   *
   * @param {Notification} notification Notification data to persist.
   * @returns {Promise<Notification>} Created notification.
   */
  create(notification: Notification): Promise<Notification>;

  /**
   * Retrieves notifications for a user with pagination, ordered by createdAt descending.
   *
   * @param {string} userId Owner identifier.
   * @param {NotificationPaginationOptions} options Pagination options (limit and offset).
   * @returns {Promise<PaginatedNotifications>} Paginated notifications with metadata.
   */
  findAllByUser(userId: string, options?: NotificationPaginationOptions): Promise<PaginatedNotifications>;

  /**
   * Finds a notification by identifier.
   *
   * @param {string} id Notification identifier.
   * @returns {Promise<Notification | null>} Matching notification or null.
   */
  findById(id: string): Promise<Notification | null>;

  /**
   * Counts unread notifications for a user.
   *
   * @param {string} userId Owner identifier.
   * @returns {Promise<number>} Count of unread notifications.
   */
  countUnreadByUser(userId: string): Promise<number>;

  /**
   * Updates the isRead status of a notification.
   *
   * @param {string} id Notification identifier.
   * @param {boolean} isRead Read status to set.
   * @returns {Promise<Notification | null>} Updated notification or null when missing.
   */
  updateReadStatus(id: string, isRead: boolean): Promise<Notification | null>;
}

