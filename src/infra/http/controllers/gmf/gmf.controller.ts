import { Response } from 'express';
import { GmfService } from '../../../../application/services/gmf.service';
import { AuthenticatedRequest } from '../../types/request.types';
import { UnauthorizedError, ValidationError } from '../../../../domain/errors/app-error';
import { sendSuccess } from '../../utils/response.util';

export class GmfController {
  constructor(private readonly gmfService: GmfService) {}

  public async getSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user?.id) {
      throw new UnauthorizedError('Usuario no autenticado');
    }

    const month = Number(req.query.month);
    const year = Number(req.query.year);

    if (!month || !year || month < 1 || month > 12 || year < 2000) {
      throw new ValidationError('Los parámetros month (1-12) y year son requeridos');
    }

    const summary = await this.gmfService.getSummary(req.user.id, month, year);
    sendSuccess(res, summary);
  }
}
