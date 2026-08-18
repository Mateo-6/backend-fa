import { param } from '../../utils/param.util';
import { Response } from 'express';
import { CreditCardService } from '../../../../application/services/credit-card.service';
import { PayCardDto } from '../../../../application/dto/credit-card/pay-card.dto';
import { AuthenticatedRequest } from '../../types/request.types';
import { UnauthorizedError, ValidationError } from '../../../../domain/errors/app-error';
import { sendSuccess } from '../../utils/response.util';
import { logger } from '../../../utils/logger';

/**
 * Controller for credit card-specific HTTP requests.
 */
export class CreditCardController {
  /**
   * @param {CreditCardService} creditCardService Service encapsulating credit card business logic.
   */
  constructor(private readonly creditCardService: CreditCardService) {}

  /**
   * Returns all credit cards for the authenticated user with summary info.
   *
   * @param {AuthenticatedRequest} req Authenticated request.
   * @param {Response} res Express response.
   * @returns {Promise<void>} Resolves when the response is dispatched.
   */
  public async getAllCards(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user?.id) throw new UnauthorizedError('Usuario no autenticado');

    const { requestId, user } = req;
    logger.info('Fetching credit cards', { requestId, userId: user.id });
    const cards = await this.creditCardService.getAllCards(user.id);
    sendSuccess(res, cards);
  }

  /**
   * Returns full detail for a single credit card.
   *
   * @param {AuthenticatedRequest} req Authenticated request with `:id` param.
   * @param {Response} res Express response.
   * @returns {Promise<void>} Resolves when the response is dispatched.
   */
  public async getCardDetail(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user?.id) throw new UnauthorizedError('Usuario no autenticado');

    const { requestId, user } = req;
    const id = param(req, 'id');

    logger.info('Fetching card detail', { requestId, userId: user.id, cardId: id });
    const detail = await this.creditCardService.getCardDetail(user.id, id);
    sendSuccess(res, detail);
  }

  /**
   * Returns the last 12 billing period statements for a credit card.
   *
   * @param {AuthenticatedRequest} req Authenticated request with `:id` param.
   * @param {Response} res Express response.
   * @returns {Promise<void>} Resolves when the response is dispatched.
   */
  public async getStatements(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user?.id) throw new UnauthorizedError('Usuario no autenticado');

    const { requestId, user } = req;
    const id = param(req, 'id');

    logger.info('Fetching card statements', { requestId, userId: user.id, cardId: id });
    const statements = await this.creditCardService.getStatements(user.id, id);
    sendSuccess(res, statements);
  }

  /**
   * Returns the detailed view for a single billing period including category breakdown.
   * The period start date is provided as a route parameter (ISO date string).
   *
   * @param {AuthenticatedRequest} req Authenticated request with `:id` and `:periodStart` params.
   * @param {Response} res Express response.
   * @returns {Promise<void>} Resolves when the response is dispatched.
   */
  public async getStatementDetail(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user?.id) throw new UnauthorizedError('Usuario no autenticado');

    const { requestId, user } = req;
    const id = param(req, 'id');
    const periodStart = param(req, 'periodStart');
    const periodStartDate = new Date(periodStart);

    if (isNaN(periodStartDate.getTime())) {
      throw new ValidationError('Formato de fecha inválido para periodStart. Usa formato ISO 8601');
    }

    logger.info('Fetching statement detail', { requestId, userId: user.id, cardId: id, periodStart });
    const detail = await this.creditCardService.getStatementDetail(user.id, id, periodStartDate);
    sendSuccess(res, detail);
  }

  /**
   * Registers a credit card payment from a bank account.
   * Atomically creates an EXPENSE transaction and reduces the card's current balance.
   *
   * @param {AuthenticatedRequest} req Authenticated request with `:id` param and validated payment body.
   * @param {Response} res Express response.
   * @returns {Promise<void>} Resolves when the response is dispatched.
   */
  public async payCard(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user?.id) throw new UnauthorizedError('Usuario no autenticado');

    const { requestId, user } = req;
    const id = param(req, 'id');
    const payCardDto: PayCardDto = req.body;

    logger.info('Processing card payment', { requestId, userId: user.id, cardId: id, amount: payCardDto.amount });
    const transaction = await this.creditCardService.payCard(user.id, id, payCardDto);
    logger.info('Card payment processed', { requestId, userId: user.id, transactionId: transaction.id });
    sendSuccess(res, transaction, 201);
  }

  /**
   * Returns the payment history for a specific credit card.
   *
   * @param {AuthenticatedRequest} req Authenticated request with `:id` param.
   * @param {Response} res Express response.
   * @returns {Promise<void>} Resolves when the response is dispatched.
   */
  public async getPaymentHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user?.id) throw new UnauthorizedError('Usuario no autenticado');

    const { requestId, user } = req;
    const id = param(req, 'id');

    logger.info('Fetching card payment history', { requestId, userId: user.id, cardId: id });
    const payments = await this.creditCardService.getPaymentHistory(user.id, id);
    sendSuccess(res, payments);
  }
}
