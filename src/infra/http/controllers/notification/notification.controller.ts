import { Response } from 'express';
import { NotificationService } from '../../../../application/services/notification.service';
import { RegisterPushTokenDto } from '../../../../application/dto/notification/register-push-token.dto';
import { GetNotificationsQueryDto } from '../../../../application/dto/notification/get-notifications-query.dto';
import { AuthenticatedRequest } from '../../types/request.types';
import { sendSuccess } from '../../utils/response.util';
import { UnauthorizedError } from '../../../../domain/errors/app-error';
import { notificationHub } from '../../notifications/notification-hub';
import { logger } from '../../../utils/logger';

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
    if (!req.user?.id) throw new UnauthorizedError('User ID not found in request');

    const { requestId, user } = req;
    const registerPushTokenDto: RegisterPushTokenDto = req.body;

    logger.info('Registering push token', { requestId, userId: user.id });
    const updatedUser = await this.notificationService.registerPushToken(user.id, registerPushTokenDto);
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
    if (!req.user?.id) throw new UnauthorizedError('Usuario no autenticado');

    const { requestId, user } = req;
    const { limit, offset } = req.query as unknown as GetNotificationsQueryDto;

    logger.info('Fetching notifications', { requestId, userId: user.id, limit, offset });
    const paginatedNotifications = await this.notificationService.getNotifications(user.id, { limit, offset });
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
    if (!req.user?.id) throw new UnauthorizedError('Usuario no autenticado');

    const { requestId, user } = req;
    const { id } = req.params;

    logger.info('Marking notification as read', { requestId, userId: user.id, notificationId: id });
    const updatedNotification = await this.notificationService.markNotificationAsRead(id, user.id);
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
    if (!req.user?.id) throw new UnauthorizedError('Usuario no autenticado');

    const { requestId, user } = req;
    logger.info('Fetching unread notification count', { requestId, userId: user.id });
    const count = await this.notificationService.getUnreadCount(user.id);
    sendSuccess(res, { count });
  }

  /**
   * Opens a Server-Sent Events stream that pushes new notifications to the
   * authenticated user in real time. The connection stays open until the
   * client closes it or the heartbeat detects a dead socket.
   *
   * @param {AuthenticatedRequest} req Express request containing the authenticated user from JWT.
   * @param {Response} res Express response kept open for streaming events.
   * @returns {Promise<void>} Resolves once the stream is set up.
   */
  public async stream(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user?.id) throw new UnauthorizedError('Usuario no autenticado');

    const { requestId, user } = req;

    res.status(200);
    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.flushHeaders?.();

    res.write(': connected\n\n');

    logger.info('Notification stream opened', { requestId, userId: user.id });

    const unsubscribe = notificationHub.subscribe(user.id, res);

    req.on('close', () => {
      unsubscribe();
      logger.info('Notification stream closed', { requestId, userId: user.id });
    });
  }
}
