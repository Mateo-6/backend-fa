import { Router } from 'express';
import { SummaryController } from '../controllers/summary/summary.controller';
import { asyncHandler } from '../middleware/async-handler.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { container } from '../../factories/service.factory';

const router = Router();

const summaryController = new SummaryController(container.summaryService);

router.get('/', authMiddleware(container.tokenService), asyncHandler(summaryController.getSummary.bind(summaryController)));

export default router;