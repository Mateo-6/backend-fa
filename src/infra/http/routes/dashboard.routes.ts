import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard/dashboard.controller';
import { asyncHandler } from '../middleware/async-handler.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { container } from '../../factories/service.factory';

const router = Router();

const dashboardController = new DashboardController(container.dashboardService);

router.get('/', authMiddleware(container.tokenService), asyncHandler(dashboardController.getDashboard.bind(dashboardController)));

export default router;
