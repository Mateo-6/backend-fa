import { Response } from 'express';
import { PaymentMethodService } from '../../../../application/services/payment-method.service';
import { CreatePaymentMethodDto } from '../../../../application/dto/payment-method/create-payment-method.dto';
import { AuthenticatedRequest } from '../../types/request.types';
import { UnauthorizedError, NotFoundError } from '../../../../domain/errors/app-error';
import { sendSuccess } from '../../utils/response.util';

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
    if (!req.user?.id) {
      throw new UnauthorizedError('User not authenticated');
    }

    const createPaymentMethodDto: CreatePaymentMethodDto = req.body;
    const paymentMethod = await this.paymentMethodService.create(createPaymentMethodDto, req.user.id);
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
    if (!req.user?.id) {
      throw new UnauthorizedError('User not authenticated');
    }

    const paymentMethods = await this.paymentMethodService.findAllByUser(req.user.id);
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
    if (!req.user?.id) {
      throw new UnauthorizedError('User not authenticated');
    }

    const { id } = req.params;
    const { transactionDate } = req.query;

    if (!transactionDate || typeof transactionDate !== 'string') {
      throw new NotFoundError('TransactionDate', 'Transaction date query parameter is required');
    }

    const date = new Date(transactionDate);
    if (isNaN(date.getTime())) {
      throw new NotFoundError('TransactionDate', 'Invalid transaction date format. Use ISO 8601 format');
    }

    const dueDate = await this.paymentMethodService.calculatePaymentDueDate(id, date);
    sendSuccess(res, { dueDate });
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
    if (!req.user?.id) {
      throw new UnauthorizedError('User not authenticated');
    }

    const { id } = req.params;
    await this.paymentMethodService.delete(id, req.user.id);
    sendSuccess(res, null, 204);
  }
}

