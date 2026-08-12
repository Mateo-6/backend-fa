import { Response } from 'express';
import { GmfService } from '../../../../application/services/gmf.service';
import { AuthenticatedRequest } from '../../types/request.types';
import { UnauthorizedError, ValidationError } from '../../../../domain/errors/app-error';
import { sendSuccess } from '../../utils/response.util';
import { logger } from '../../../utils/logger';

export class GmfController {
  constructor(private readonly gmfService: GmfService) {}

  /**
   * Returns a monthly GMF summary for the authenticated user.
   *
   * @param {AuthenticatedRequest} req Authenticated request with `month` and `year` query params.
   * @param {Response} res Express response.
   * @returns {Promise<void>} Resolves when the response is dispatched.
   */
  public async getSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user?.id) throw new UnauthorizedError('Usuario no autenticado');

    const { requestId, user } = req;
    const month = Number(req.query.month);
    const year  = Number(req.query.year);

    if (!month || !year || month < 1 || month > 12 || year < 2000) {
      throw new ValidationError('Los parámetros month (1-12) y year son requeridos');
    }

    logger.info('Fetching GMF summary', { requestId, userId: user.id, month, year });
    const summary = await this.gmfService.getSummary(user.id, month, year);
    sendSuccess(res, summary);
  }
}
