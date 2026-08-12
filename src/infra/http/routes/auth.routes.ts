import { Router } from 'express';
import { AuthController } from '../controllers/auth/auth.controller';
import { validate } from '../middleware/validation.middleware';
import { loginSchema } from '../../../application/dto/auth/login.dto';
import { refreshTokenSchema } from '../../../application/dto/auth/refresh-token.dto';
import { asyncHandler } from '../middleware/async-handler.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { loginRateLimit } from '../middleware/rate-limit.middleware';
import { container } from '../../factories/service.factory';

const router = Router();

const authController = new AuthController(container.authService);

router.post('/login', loginRateLimit, validate(loginSchema), asyncHandler(authController.login.bind(authController)));
router.post('/refresh', validate(refreshTokenSchema), asyncHandler(authController.refresh.bind(authController)));
router.post('/logout', authMiddleware(container.tokenService), validate(refreshTokenSchema.partial()), asyncHandler(authController.logout.bind(authController)));

export default router;
