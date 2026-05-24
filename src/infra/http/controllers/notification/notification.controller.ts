import { Response } from 'express';
import { NotificationService } from '../../../../application/services/notification.service';
import { RegisterPushTokenDto } from '../../../../application/dto/notification/register-push-token.dto';
import { GetNotificationsQueryDto } from '../../../../application/dto/notification/get-notifications-query.dto';
import { AuthenticatedRequest } from '../../types/request.types';
import { sendSuccess } from '../../utils/response.util';
import { UnauthorizedError } from '../../../../domain/errors/app-error';

/**
 * Controller for handling notification-related HTTP requests.
 */
export class NotificationController {
  private readonly notificationService: NotificationService;

  /**
   * @param {NotificationService} notificationService Service encapsulating notification business logic.
   */
  constructor(notificationService: NotificationService) {
    this.notificationService = notificationService;
  }

  /**
   * Registers an Expo push token for the authenticated user.
   * The userId is extracted from the JWT token via the authentication middleware.
   *
   * @param {AuthenticatedRequest} req Express request containing the token in body and userId from JWT.
   * @param {Response} res Express response used to return the updated user.
   * @returns {Promise<void>} Resolves when the response is sent.
   */
  public async registerToken(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user?.id) {
      throw new UnauthorizedError('User ID not found in request');
    }

    const registerPushTokenDto: RegisterPushTokenDto = req.body;
    const userId = req.user.id;

    const updatedUser = await this.notificationService.registerPushToken(userId, registerPushTokenDto);
    
    sendSuccess(res, { message: 'Token registrado exitosamente', user: updatedUser }, 200);
  }

  /**
   * Retrieves paginated notifications for the authenticated user.
   * The userId is obtained from the JWT token.
   * Notifications are ordered by createdAt descending (newest first).
   *
   * @param {AuthenticatedRequest} req Express request containing query parameters for pagination (limit, offset).
   * @param {Response} res Express response used to send the paginated notifications.
   * @returns {Promise<void>} Resolves when the response is dispatched.
   */
  public async getNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user?.id) {
      throw new UnauthorizedError('Usuario no autenticado');
    }

    const { limit, offset } = req.query as unknown as GetNotificationsQueryDto;

    const paginatedNotifications = await this.notificationService.getNotifications(req.user.id, {
      limit,
      offset,
    });

    sendSuccess(res, paginatedNotifications);
  }

  /**
   * Marks a notification as read.
   * Validates that the notification belongs to the authenticated user.
   *
   * @param {AuthenticatedRequest} req Express request containing the notification ID parameter.
   * @param {Response} res Express response used to send the updated notification.
   * @returns {Promise<void>} Resolves when the response is dispatched.
   */
  public async markAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user?.id) {
      throw new UnauthorizedError('Usuario no autenticado');
    }

    const { id } = req.params;
    const updatedNotification = await this.notificationService.markNotificationAsRead(id, req.user.id);

    sendSuccess(res, updatedNotification);
  }

  /**
   * Gets the count of unread notifications for the authenticated user.
   * The userId is obtained from the JWT token.
   *
   * @param {AuthenticatedRequest} req Express request containing the authenticated user from JWT.
   * @param {Response} res Express response used to send the unread count.
   * @returns {Promise<void>} Resolves when the response is dispatched.
   */
  public async getUnreadCount(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user?.id) {
      throw new UnauthorizedError('Usuario no autenticado');
    }

    const count = await this.notificationService.getUnreadCount(req.user.id);

    sendSuccess(res, { count });
  }
}

