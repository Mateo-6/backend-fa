import { param } from '../../utils/param.util';
import { Response } from 'express';
import { PaymentMethodService } from '../../../../application/services/payment-method.service';
import { CreatePaymentMethodDto } from '../../../../application/dto/payment-method/create-payment-method.dto';
import { UpdatePaymentMethodDto } from '../../../../application/dto/payment-method/update-payment-method.dto';
import { ToggleGmfExemptDto } from '../../../../application/dto/payment-method/toggle-gmf-exempt.dto';
import { AuthenticatedRequest } from '../../types/request.types';
import { UnauthorizedError, NotFoundError } from '../../../../domain/errors/app-error';
import { sendSuccess } from '../../utils/response.util';
import { logger } from '../../../utils/logger';

/**
 * Controller for handling payment method-related HTTP requests.
 */
export class PaymentMethodController {
  /**
   * @param {PaymentMethodService} paymentMethodService Service encapsulating payment method business logic.
   */
  constructor(private readonly paymentMethodService: PaymentMethodService) {}

  /**
   * Creates a new payment method using the provided payload.
   * The userId is obtained from the JWT token (authenticated user).
   *
   * @param {AuthenticatedRequest} req Express request whose body contains the validated payload and user from JWT.
   * @param {Response} res Express response used to send the payment method.
   * @returns {Promise<void>} Resolves when the response is dispatched.
   */
  public async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user?.id) throw new UnauthorizedError('Usuario no autenticado');

    const { requestId, user } = req;
    const createPaymentMethodDto: CreatePaymentMethodDto = req.body;

    logger.info('Creating payment method', { requestId, userId: user.id, name: createPaymentMethodDto.name });
    const paymentMethod = await this.paymentMethodService.create(createPaymentMethodDto, user.id);
    logger.info('Payment method created', { requestId, userId: user.id, paymentMethodId: paymentMethod.id });
    sendSuccess(res, paymentMethod, 201);
  }

  /**
   * Retrieves all payment methods for the authenticated user.
   * The userId is obtained from the JWT token.
   *
   * @param {AuthenticatedRequest} req Express request containing the authenticated user from JWT.
   * @param {Response} res Express response used to send the payment method collection.
   * @returns {Promise<void>} Resolves when the response is dispatched.
   */
  public async getAll(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user?.id) throw new UnauthorizedError('Usuario no autenticado');

    const { requestId, user } = req;
    logger.info('Fetching payment methods', { requestId, userId: user.id });
    const paymentMethods = await this.paymentMethodService.findAllByUser(user.id);
    sendSuccess(res, paymentMethods);
  }

  /**
   * Calculates the payment due date for a credit card transaction.
   *
   * @param {AuthenticatedRequest} req Express request containing the payment method ID and transaction date query parameter.
   * @param {Response} res Express response used to send the calculated due date.
   * @returns {Promise<void>} Resolves when the response is dispatched.
   */
  public async calculatePaymentDueDate(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user?.id) throw new UnauthorizedError('Usuario no autenticado');

    const { requestId, user } = req;
    const id = param(req, 'id');
    const { transactionDate } = req.query;

    if (!transactionDate || typeof transactionDate !== 'string') {
      throw new NotFoundError('TransactionDate', 'Se requiere el parámetro de consulta de fecha de transacción');
    }

    const date = new Date(transactionDate);
    if (isNaN(date.getTime())) {
      throw new NotFoundError('TransactionDate', 'Formato de fecha de transacción inválido. Usa el formato ISO 8601');
    }

    logger.info('Calculating payment due date', { requestId, userId: user.id, paymentMethodId: id, transactionDate });
    const dueDate = await this.paymentMethodService.calculatePaymentDueDate(id, date);
    sendSuccess(res, { dueDate });
  }

  public async toggleGmfExempt(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user?.id) throw new UnauthorizedError('Usuario no autenticado');

    const { requestId, user } = req;
    const id = param(req, 'id');
    const { is_exempt }: ToggleGmfExemptDto = req.body;

    logger.info('Updating GMF exemption', { requestId, userId: user.id, paymentMethodId: id, is_exempt });
    const paymentMethod = await this.paymentMethodService.toggleGmfExempt(user.id, id, is_exempt);
    sendSuccess(res, paymentMethod);
  }

  /**
   * Updates an existing payment method.
   * Validates that the payment method belongs to the authenticated user.
   *
   * @param {AuthenticatedRequest} req Express request containing the identifier parameter and validated body.
   * @param {Response} res Express response used to send the updated payment method.
   * @returns {Promise<void>} Resolves when the response is dispatched.
   */
  public async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user?.id) throw new UnauthorizedError('Usuario no autenticado');

    const { requestId, user } = req;
    const id = param(req, 'id');
    const updatePaymentMethodDto: UpdatePaymentMethodDto = req.body;

    logger.info('Updating payment method', { requestId, userId: user.id, paymentMethodId: id });
    const paymentMethod = await this.paymentMethodService.update(id, updatePaymentMethodDto, user.id);
    sendSuccess(res, paymentMethod);
  }

  /**
   * Deletes a payment method by identifier.
   * Validates that the payment method belongs to the authenticated user.
   *
   * @param {AuthenticatedRequest} req Express request containing the identifier parameter.
   * @param {Response} res Express response used to send the confirmation.
   * @returns {Promise<void>} Resolves when the response is dispatched.
   */
  public async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user?.id) throw new UnauthorizedError('Usuario no autenticado');

    const { requestId, user } = req;
    const id = param(req, 'id');

    logger.info('Deleting payment method', { requestId, userId: user.id, paymentMethodId: id });
    await this.paymentMethodService.delete(id, user.id);
    sendSuccess(res, null, 204);
  }
}
