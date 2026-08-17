import { Response } from 'express';
import { SummaryService } from '../../../../application/services/summary.service';
import { AuthenticatedRequest } from '../../types/request.types';
import { UnauthorizedError } from '../../../../domain/errors/app-error';
import { sendSuccess } from '../../utils/response.util';
import { logger } from '../../../utils/logger';

/**
 * Controller for handling summary-related HTTP requests.
 */
export class SummaryController {
  private readonly summaryService: SummaryService;

  /**
   * @param {SummaryService} summaryService Service for summary operations.
   */
  constructor(summaryService: SummaryService) {
    this.summaryService = summaryService;
  }

  /**
   * Retrieves complete summary data for the authenticated user.
   * Returns financial summary, recent transactions, and upcoming payments.
   *
   * @param {AuthenticatedRequest} req Express request containing authenticated user information.
   * @param {Response} res Express response used to return the summary data.
   * @returns {Promise<void>} Resolves when the response is sent.
   */
  public async getSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user?.id) throw new UnauthorizedError('Usuario no autenticado');

    const { requestId, user } = req;
    logger.info('Fetching summary', { requestId, userId: user.id });
    const summaryData = await this.summaryService.getSummaryData(user.id);
    sendSuccess(res, summaryData);
  }
}