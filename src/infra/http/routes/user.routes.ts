import { Router } from 'express';
import { UserController } from '../controllers/user/user.controller';
import { validate } from '../middleware/validation.middleware';
import { createUserSchema } from '../../../application/dto/user/create-user.dto';
import { updateUserSchema } from '../../../application/dto/user/update-user.dto';
import { asyncHandler } from '../middleware/async-handler.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { container } from '../../factories/service.factory';

const router = Router();

const userController = new UserController(container.userService);

router.post('/', validate(createUserSchema), asyncHandler(userController.create.bind(userController)));
router.get('/', authMiddleware(container.tokenService), asyncHandler(userController.getAll.bind(userController)));
router.get('/:id', authMiddleware(container.tokenService), asyncHandler(userController.getById.bind(userController)));
router.put('/:id', validate(updateUserSchema), asyncHandler(userController.update.bind(userController)));
router.delete('/:id', asyncHandler(userController.delete.bind(userController)));

export default router;
