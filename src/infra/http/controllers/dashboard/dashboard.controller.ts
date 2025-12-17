import { Response } from 'express';
import { DashboardService } from '../../../../application/services/dashboard.service';
import { AuthenticatedRequest } from '../../types/request.types';
import { UnauthorizedError } from '../../../../domain/errors/app-error';
import { sendSuccess } from '../../utils/response.util';

/**
 * Controller for handling dashboard-related HTTP requests.
 */
export class DashboardController {
  private readonly dashboardService: DashboardService;

  /**
   * @param {DashboardService} dashboardService Service for dashboard operations.
   */
  constructor(dashboardService: DashboardService) {
    this.dashboardService = dashboardService;
  }

  /**
   * Retrieves complete dashboard data for the authenticated user.
   * Returns financial summary, recent transactions, and upcoming payments.
   *
   * @param {AuthenticatedRequest} req Express request containing authenticated user information.
   * @param {Response} res Express response used to return the dashboard data.
   * @returns {Promise<void>} Resolves when the response is sent.
   */
  public async getDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user?.id) {
      throw new UnauthorizedError('User not authenticated');
    }

    const dashboardData = await this.dashboardService.getDashboardData(req.user.id);
    sendSuccess(res, dashboardData);
  }
}

