import { Router } from 'express';
import { CategoryController } from '../controllers/category/category.controller';
import { CategoryService } from '../../../domain/category/services/category-service';
import { CategoryMongooseRepository } from '../../repositories/category-mongoose.repository';
import { UserMongooseRepository } from '../../repositories/user-mongoose.repository';
import { validate } from '../middleware/validation.middleware';
import { createCategorySchema } from '../../../application/dto/category/create-category.dto';
import { updateCategorySchema } from '../../../application/dto/category/update-category.dto';
import { asyncHandler } from '../middleware/async-handler.middleware';

const router = Router();

const categoryRepository = new CategoryMongooseRepository();
const userRepository = new UserMongooseRepository();
const categoryService = new CategoryService(categoryRepository, userRepository);
const categoryController = new CategoryController(categoryService);

router.post('/', validate(createCategorySchema), asyncHandler(categoryController.create.bind(categoryController)));
router.get('/', asyncHandler(categoryController.getAll.bind(categoryController)));
router.get('/:id', asyncHandler(categoryController.getById.bind(categoryController)));
router.put('/:id', validate(updateCategorySchema), asyncHandler(categoryController.update.bind(categoryController)));
router.delete('/:id', asyncHandler(categoryController.delete.bind(categoryController)));

export default router;

