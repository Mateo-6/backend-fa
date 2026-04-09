import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthController } from '../controllers/auth/auth.controller';
import { AuthService } from '../../../application/services/auth.service';
import { UserMongooseRepository } from '../../repositories/user-mongoose.repository';
import { JwtTokenService } from '../../services/jwt-token.service';
import { BcryptPasswordService } from '../../services/bcrypt-password.service';
import { validate } from '../middleware/validation.middleware';
import { loginSchema } from '../../../application/dto/auth/login.dto';
import { refreshTokenSchema } from '../../../application/dto/auth/refresh-token.dto';
import { asyncHandler } from '../middleware/async-handler.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { RefreshTokenMongooseRepository } from '../../repositories/refresh-token-mongoose.repository';

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

// Dependency injection setup
const userRepository = new UserMongooseRepository();
const tokenService = new JwtTokenService();
const passwordService = new BcryptPasswordService();
const refreshTokenRepository = new RefreshTokenMongooseRepository();
const authService = new AuthService(userRepository, tokenService, passwordService, refreshTokenRepository);
const authController = new AuthController(authService);

router.post('/login', loginLimiter, validate(loginSchema), asyncHandler(authController.login.bind(authController)));
router.post('/refresh', validate(refreshTokenSchema), asyncHandler(authController.refresh.bind(authController)));
router.post('/logout', authMiddleware(tokenService), validate(refreshTokenSchema.partial()), asyncHandler(authController.logout.bind(authController)));

export default router;

