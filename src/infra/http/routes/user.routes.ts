import { Router } from 'express';
import { UserController } from '../controllers/user/user.controller';
import { UserService } from '../../../application/services/user.service';
import { validate } from '../middleware/validation.middleware';
import { createUserSchema } from '../../../application/dto/user/create-user.dto';
import { updateUserSchema } from '../../../application/dto/user/update-user.dto';
import { UserMongooseRepository } from '../../repositories/user-mongoose.repository';
import { CategoryMongooseRepository } from '../../repositories/category-mongoose.repository';
import { asyncHandler } from '../middleware/async-handler.middleware';
import { BcryptPasswordService } from '../../services/bcrypt-password.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { JwtTokenService } from '../../services/jwt-token.service';

const router = Router();

// Dependency injection setup
const userRepository = new UserMongooseRepository();
const categoryRepository = new CategoryMongooseRepository();
const passwordService = new BcryptPasswordService();
const tokenService = new JwtTokenService();
const userService = new UserService(userRepository, passwordService, categoryRepository);
const userController = new UserController(userService);

router.post('/', validate(createUserSchema), asyncHandler(userController.create.bind(userController)));
router.get('/', authMiddleware(tokenService), asyncHandler(userController.getAll.bind(userController)));
router.get('/:id', authMiddleware(tokenService), asyncHandler(userController.getById.bind(userController)));
router.put('/:id', validate(updateUserSchema), asyncHandler(userController.update.bind(userController)));
router.delete('/:id', asyncHandler(userController.delete.bind(userController)));

export default router;

