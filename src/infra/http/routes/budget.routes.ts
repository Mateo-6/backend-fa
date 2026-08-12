import { Router } from 'express';
import { BudgetController } from '../controllers/budget/budget.controller';
import { validate } from '../middleware/validation.middleware';
import { createBudgetSchema } from '../../../application/dto/budget/create-budget.dto';
import { updateBudgetSchema } from '../../../application/dto/budget/update-budget.dto';
import { asyncHandler } from '../middleware/async-handler.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { container } from '../../factories/service.factory';

const router = Router();

const budgetController = new BudgetController(container.budgetService);

// NOTE: /summary and /history must be registered BEFORE /:id to avoid route conflicts
router.post('/', authMiddleware(container.tokenService), validate(createBudgetSchema), asyncHandler(budgetController.create.bind(budgetController)));
router.get('/', authMiddleware(container.tokenService), asyncHandler(budgetController.getAll.bind(budgetController)));
router.get('/summary', authMiddleware(container.tokenService), asyncHandler(budgetController.getSummary.bind(budgetController)));
router.get('/history', authMiddleware(container.tokenService), asyncHandler(budgetController.getHistory.bind(budgetController)));
router.get('/:id', authMiddleware(container.tokenService), asyncHandler(budgetController.getById.bind(budgetController)));
router.put('/:id', authMiddleware(container.tokenService), validate(updateBudgetSchema), asyncHandler(budgetController.update.bind(budgetController)));
router.patch('/:id/recalculate', authMiddleware(container.tokenService), asyncHandler(budgetController.recalculate.bind(budgetController)));
router.patch('/:id/finalize', authMiddleware(container.tokenService), asyncHandler(budgetController.finalize.bind(budgetController)));
router.delete('/:id', authMiddleware(container.tokenService), asyncHandler(budgetController.permanentDelete.bind(budgetController)));

export default router;
