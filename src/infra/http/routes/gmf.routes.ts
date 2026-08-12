import { Router } from 'express';
import { GmfController } from '../controllers/gmf/gmf.controller';
import { asyncHandler } from '../middleware/async-handler.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { container } from '../../factories/service.factory';

const router = Router();

const gmfController = new GmfController(container.gmfService);

router.get('/summary', authMiddleware(container.tokenService), asyncHandler(gmfController.getSummary.bind(gmfController)));

export default router;
