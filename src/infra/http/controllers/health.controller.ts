import { Request, Response } from 'express';
import { HealthService } from '../../../domain/health/services/health-service';
import { sendSuccess } from '../utils/response.util';

export class HealthController {
  private readonly healthService: HealthService;

  /**
   * @param {HealthService} healthService Service providing health information.
   */
  constructor(healthService: HealthService) {
    this.healthService = healthService;
  }

  /**
   * Returns a simple health report exposed through the health endpoint.
   *
   * @param {Request} req Express request object.
   * @param {Response} res Express response used to send the health data.
   * @returns {void} Nothing is returned; response is sent directly.
   */
  public getHealth = (req: Request, res: Response): void => {
    const result = this.healthService.check();
    sendSuccess(res, result);
  };
}