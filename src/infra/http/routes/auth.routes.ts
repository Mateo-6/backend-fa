import { Router } from 'express';
import { AuthController } from '../controllers/auth/auth.controller';
import { AuthService } from '../../../application/services/auth.service';
import { UserMongooseRepository } from '../../repositories/user-mongoose.repository';
import { JwtTokenService } from '../../services/jwt-token.service';
import { BcryptPasswordService } from '../../services/bcrypt-password.service';
import { validate } from '../middleware/validation.middleware';
import { loginSchema } from '../../../application/dto/auth/login.dto';
import { asyncHandler } from '../middleware/async-handler.middleware';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Dependency injection setup
const userRepository = new UserMongooseRepository();
const tokenService = new JwtTokenService();
const passwordService = new BcryptPasswordService();
const authService = new AuthService(userRepository, tokenService, passwordService);
const authController = new AuthController(authService);

router.post('/login', validate(loginSchema), asyncHandler(authController.login.bind(authController)));
router.post('/logout', authMiddleware(tokenService), asyncHandler(authController.logout.bind(authController)));

export default router;

