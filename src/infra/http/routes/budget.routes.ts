import { Router } from 'express';
import { BudgetController } from '../controllers/budget/budget.controller';
import { BudgetService } from '../../../application/services/budget.service';
import { BudgetMongooseRepository } from '../../repositories/budget-mongoose.repository';
import { TransactionMongooseRepository } from '../../repositories/transaction-mongoose.repository';
import { NotificationMongooseRepository } from '../../repositories/notification-mongoose.repository';
import { UserMongooseRepository } from '../../repositories/user-mongoose.repository';
import { validate } from '../middleware/validation.middleware';
import { createBudgetSchema } from '../../../application/dto/budget/create-budget.dto';
import { updateBudgetSchema } from '../../../application/dto/budget/update-budget.dto';
import { asyncHandler } from '../middleware/async-handler.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { JwtTokenService } from '../../services/jwt-token.service';

const router = Router();

// Dependency injection setup
const budgetRepository = new BudgetMongooseRepository();
const transactionRepository = new TransactionMongooseRepository();
const notificationRepository = new NotificationMongooseRepository();
const userRepository = new UserMongooseRepository();
const tokenService = new JwtTokenService();

const budgetService = new BudgetService(
  budgetRepository,
  transactionRepository,
  notificationRepository,
  userRepository
);

const budgetController = new BudgetController(budgetService);

// NOTE: /summary and /history must be registered BEFORE /:id to avoid route conflicts
router.post(
  '/',
  authMiddleware(tokenService),
  validate(createBudgetSchema),
  asyncHandler(budgetController.create.bind(budgetController))
);

router.get(
  '/',
  authMiddleware(tokenService),
  asyncHandler(budgetController.getAll.bind(budgetController))
);

router.get(
  '/summary',
  authMiddleware(tokenService),
  asyncHandler(budgetController.getSummary.bind(budgetController))
);

router.get(
  '/history',
  authMiddleware(tokenService),
  asyncHandler(budgetController.getHistory.bind(budgetController))
);

router.get(
  '/:id',
  authMiddleware(tokenService),
  asyncHandler(budgetController.getById.bind(budgetController))
);

router.put(
  '/:id',
  authMiddleware(tokenService),
  validate(updateBudgetSchema),
  asyncHandler(budgetController.update.bind(budgetController))
);

router.patch(
  '/:id/finalize',
  authMiddleware(tokenService),
  asyncHandler(budgetController.finalize.bind(budgetController))
);

router.delete(
  '/:id',
  authMiddleware(tokenService),
  asyncHandler(budgetController.permanentDelete.bind(budgetController))
);

export default router;
