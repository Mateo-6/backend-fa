import { Request, Response } from 'express';
import { HealthService } from '../../../domain/health/services/health-service';

export class HealthController {
  private readonly healthService: HealthService;

  constructor(healthService: HealthService) {
    this.healthService = healthService;
  }

  public getHealth = (req: Request, res: Response): void => {
    const result = this.healthService.check();
    res.status(200).json(result);
  };
}