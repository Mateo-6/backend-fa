import { Response } from 'express';
import { NotificationService } from '../../../../application/services/notification.service';
import { RegisterPushTokenDto } from '../../../../application/dto/notification/register-push-token.dto';
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
}

