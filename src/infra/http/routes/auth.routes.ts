import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthController } from '../controllers/auth/auth.controller';
import { validate } from '../middleware/validation.middleware';
import { loginSchema } from '../../../application/dto/auth/login.dto';
import { refreshTokenSchema } from '../../../application/dto/auth/refresh-token.dto';
import { asyncHandler } from '../middleware/async-handler.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { container } from '../../factories/service.factory';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      status: false,
      code: 429,
      error: 'Demasiados intentos. Inténtalo en 15 minutos.',
    });
  },
});

const authController = new AuthController(container.authService);

router.post('/login', loginLimiter, validate(loginSchema), asyncHandler(authController.login.bind(authController)));
router.post('/refresh', validate(refreshTokenSchema), asyncHandler(authController.refresh.bind(authController)));
router.post('/logout', authMiddleware(container.tokenService), validate(refreshTokenSchema.partial()), asyncHandler(authController.logout.bind(authController)));

export default router;
