import { Router } from 'express';
import { CategoryController } from '../controllers/category/category.controller';
import { validate } from '../middleware/validation.middleware';
import { createCategorySchema } from '../../../application/dto/category/create-category.dto';
import { updateCategorySchema } from '../../../application/dto/category/update-category.dto';
import { asyncHandler } from '../middleware/async-handler.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { container } from '../../factories/service.factory';

const router = Router();

const categoryController = new CategoryController(container.categoryService);

router.post('/', authMiddleware(container.tokenService), validate(createCategorySchema), asyncHandler(categoryController.create.bind(categoryController)));
router.get('/', authMiddleware(container.tokenService), asyncHandler(categoryController.getAll.bind(categoryController)));
router.get('/:id', authMiddleware(container.tokenService), asyncHandler(categoryController.getById.bind(categoryController)));
router.put('/:id', authMiddleware(container.tokenService), validate(updateCategorySchema), asyncHandler(categoryController.update.bind(categoryController)));
router.delete('/:id', authMiddleware(container.tokenService), asyncHandler(categoryController.delete.bind(categoryController)));

export default router;
