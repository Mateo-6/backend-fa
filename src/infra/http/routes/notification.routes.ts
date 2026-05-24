import { Router } from 'express';
import { NotificationController } from '../controllers/notification/notification.controller';
import { validate } from '../middleware/validation.middleware';
import { registerPushTokenSchema } from '../../../application/dto/notification/register-push-token.dto';
import { asyncHandler } from '../middleware/async-handler.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { container } from '../../factories/service.factory';

const router = Router();

const notificationController = new NotificationController(container.notificationService);

router.post('/register-token', authMiddleware(container.tokenService), validate(registerPushTokenSchema), asyncHandler(notificationController.registerToken.bind(notificationController)));
router.get('/', authMiddleware(container.tokenService), asyncHandler(notificationController.getNotifications.bind(notificationController)));
router.patch('/:id/read', authMiddleware(container.tokenService), asyncHandler(notificationController.markAsRead.bind(notificationController)));
router.get('/unread-count', authMiddleware(container.tokenService), asyncHandler(notificationController.getUnreadCount.bind(notificationController)));

export default router;
