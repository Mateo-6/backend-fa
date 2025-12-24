import { Router } from 'express';
import { NotificationController } from '../controllers/notification/notification.controller';
import { NotificationService } from '../../../application/services/notification.service';
import { UserMongooseRepository } from '../../repositories/user-mongoose.repository';
import { validate } from '../middleware/validation.middleware';
import { registerPushTokenSchema } from '../../../application/dto/notification/register-push-token.dto';
import { asyncHandler } from '../middleware/async-handler.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { JwtTokenService } from '../../services/jwt-token.service';

const router = Router();

// Dependency injection setup
const userRepository = new UserMongooseRepository();
const tokenService = new JwtTokenService();
const notificationService = new NotificationService(userRepository);
const notificationController = new NotificationController(notificationService);

router.post(
  '/register-token',
  authMiddleware(tokenService),
  validate(registerPushTokenSchema),
  asyncHandler(notificationController.registerToken.bind(notificationController))
);

export default router;

