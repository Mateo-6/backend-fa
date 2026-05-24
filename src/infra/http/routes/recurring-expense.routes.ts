import { Router } from 'express';
import { RecurringExpenseController } from '../controllers/finance/recurring-expense.controller';
import { validate } from '../middleware/validation.middleware';
import { createRecurringSchema } from '../../../application/dto/finance/create-recurring.dto';
import { asyncHandler } from '../middleware/async-handler.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { container } from '../../factories/service.factory';

const router = Router();

const recurringExpenseController = new RecurringExpenseController(container.recurringExpenseService);

router.post('/', authMiddleware(container.tokenService), validate(createRecurringSchema), asyncHandler(recurringExpenseController.create.bind(recurringExpenseController)));
router.get('/', authMiddleware(container.tokenService), asyncHandler(recurringExpenseController.getAll.bind(recurringExpenseController)));
router.put('/:id', authMiddleware(container.tokenService), asyncHandler(recurringExpenseController.update.bind(recurringExpenseController)));
router.delete('/:id', authMiddleware(container.tokenService), asyncHandler(recurringExpenseController.delete.bind(recurringExpenseController)));

export default router;
