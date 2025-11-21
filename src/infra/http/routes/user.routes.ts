import { Router } from 'express';
import { UserController } from '../controllers/user/user.controller';
import { UserService } from '../../../domain/user/services/user-service';
import { UserPrismaRepository } from '../../repositories/user-prisma.repository';
import { validate } from '../middleware/validation.middleware';
import { createUserSchema } from '../../../application/dto/user/create-user.dto';

const router = Router();

// Dependency injection setup
const userRepository = new UserPrismaRepository();
const userService = new UserService(userRepository);
const userController = new UserController(userService);

router.post('/', validate(createUserSchema), userController.create.bind(userController));
router.get('/', userController.getAll.bind(userController));
router.get('/:id', userController.getById.bind(userController));

export default router;

