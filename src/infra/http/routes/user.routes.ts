import { Router } from 'express';
import { UserController } from '../controllers/user/user.controller';
import { UserService } from '../../../domain/user/services/user-service';
import { UserPrismaRepository } from '../../repositories/user-prisma.repository';
import { validate } from '../middleware/validation.middleware';
import { createUserSchema } from '../../../application/dto/user/create-user.dto';
import { UserMongooseRepository } from '../../repositories/user-mongoose.repository';
import { asyncHandler } from '../middleware/async-handler.middleware';
import { BcryptPasswordService } from '../../services/bcrypt-password.service';

const router = Router();

// Dependency injection setup
const userRepository = new UserMongooseRepository();
const passwordService = new BcryptPasswordService();
const userService = new UserService(userRepository, passwordService);
const userController = new UserController(userService);

router.post('/', validate(createUserSchema), asyncHandler(userController.create.bind(userController)));
router.get('/', asyncHandler(userController.getAll.bind(userController)));
router.get('/:id', asyncHandler(userController.getById.bind(userController)));

export default router;

