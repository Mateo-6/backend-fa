import { Request, Response } from 'express';
import { HealthService } from '../../../domain/health/services/health-service';
import { sendSuccess } from '../utils/response.util';

export class HealthController {
  private readonly healthService: HealthService;

  constructor(healthService: HealthService) {
    this.healthService = healthService;
  }

  public getHealth = (req: Request, res: Response): void => {
    const result = this.healthService.check();
    sendSuccess(res, result);
  };
}
