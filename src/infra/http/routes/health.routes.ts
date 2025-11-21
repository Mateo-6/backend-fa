import { Router } from 'express';
import { HealthController } from '../controllers/health.controller';
import { HealthService } from '../../../domain/health/services/health-service';

const router = Router();

// Dependency injection setup
const healthService = new HealthService();
const healthController = new HealthController(healthService);

router.get('/', healthController.getHealth);

export default router;