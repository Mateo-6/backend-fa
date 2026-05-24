import { Router } from 'express';
import { CategoryController } from '../controllers/category/category.controller';
import { CategoryService } from '../../../application/services/category.service';
import { CategoryMongooseRepository } from '../../repositories/category-mongoose.repository';
import { UserMongooseRepository } from '../../repositories/user-mongoose.repository';
import { validate } from '../middleware/validation.middleware';
import { createCategorySchema } from '../../../application/dto/category/create-category.dto';
import { updateCategorySchema } from '../../../application/dto/category/update-category.dto';
import { asyncHandler } from '../middleware/async-handler.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { JwtTokenService } from '../../services/jwt-token.service';
import { redisCacheService } from '../../services/redis-cache.service';

const router = Router();

const categoryRepository = new CategoryMongooseRepository();
const userRepository = new UserMongooseRepository();
const categoryService = new CategoryService(categoryRepository, userRepository, redisCacheService);
const categoryController = new CategoryController(categoryService);
const tokenService = new JwtTokenService();

// All category routes are protected with authentication middleware
router.post('/', authMiddleware(tokenService), validate(createCategorySchema), asyncHandler(categoryController.create.bind(categoryController)));
router.get('/', authMiddleware(tokenService), asyncHandler(categoryController.getAll.bind(categoryController)));
router.get('/:id', authMiddleware(tokenService), asyncHandler(categoryController.getById.bind(categoryController)));
router.put('/:id', authMiddleware(tokenService), validate(updateCategorySchema), asyncHandler(categoryController.update.bind(categoryController)));
router.delete('/:id', authMiddleware(tokenService), asyncHandler(categoryController.delete.bind(categoryController)));

export default router;

