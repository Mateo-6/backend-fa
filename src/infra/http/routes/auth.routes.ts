import { Router } from 'express';
import { AuthController } from '../controllers/auth/auth.controller';
import { LoginUserUseCase } from '../../../application/use-cases/auth/login-user.use-case';
import { UserMongooseRepository } from '../../repositories/user-mongoose.repository';
import { JwtTokenService } from '../../services/jwt-token.service';
import { BcryptPasswordService } from '../../services/bcrypt-password.service';
import { validate } from '../middleware/validation.middleware';
import { loginSchema } from '../../../domain/auth/dtos/login.dto';
import { asyncHandler } from '../middleware/async-handler.middleware';

const router = Router();

// Dependency injection setup
const userRepository = new UserMongooseRepository();
const tokenService = new JwtTokenService();
const passwordService = new BcryptPasswordService();
const loginUserUseCase = new LoginUserUseCase(userRepository, tokenService, passwordService);
const authController = new AuthController(loginUserUseCase);

router.post('/login', validate(loginSchema), asyncHandler(authController.login.bind(authController)));

export default router;

