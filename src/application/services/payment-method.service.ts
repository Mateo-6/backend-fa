import { PaymentMethodRepository } from '../../domain/payment-method/repositories/payment-method.repository';
import { UserRepository } from '../../domain/user/repositories/user.repository';
import { CreatePaymentMethodDto } from '../dto/payment-method/create-payment-method.dto';
import { UpdatePaymentMethodDto } from '../dto/payment-method/update-payment-method.dto';
import { PaymentMethod, PaymentMethodType, CreditCardDetails, BankAccountDetails, CashDetails, BankAccountType } from '../../domain/payment-method/types/payment-method.types';
import { NotFoundError, ForbiddenError, ValidationError } from '../../domain/errors/app-error';
import { ICache } from '../../domain/cache/cache.interface';
import { cacheKeys } from '../constants/cache-keys';
import { logger } from '../../infra/utils/logger';
import { getRequestContext } from '../../infra/http/middleware/request-context';

/**
 * Service for managing payment methods.
 * Orchestrates payment method use cases, validates authorization, and coordinates repositories.
 */
export class PaymentMethodService {
  /**
   * @param {PaymentMethodRepository} paymentMethodRepository Repository responsible for persistence.
   * @param {UserRepository} userRepository Repository used to validate the owner existence.
   */
  constructor(
    private readonly paymentMethodRepository: PaymentMethodRepository,
    private readonly userRepository: UserRepository,
    private readonly cache: ICache,
  ) {}

  /**
   * Creates a payment method after verifying the owner exists.
   *
   * @param {CreatePaymentMethodDto} data Validated payment method payload.
   * @param {string} userId User identifier obtained from JWT token.
   * @returns {Promise<PaymentMethod>} Newly created payment method.
   */
  async create(data: CreatePaymentMethodDto, userId: string): Promise<PaymentMethod> {
    const ctx = getRequestContext();
    await this.ensureUserExists(userId);
    const paymentMethod = await this.paymentMethodRepository.create({ ...data, userId, details: data.details || {} });
    this.cache.del(cacheKeys.paymentMethods(userId)).catch(() => {});
    logger.info('Payment method persisted to DB', { ...ctx, paymentMethodId: paymentMethod.id, type: paymentMethod.type });
    return paymentMethod;
  }

  /**
   * Retrieves every payment method associated with the provided user.
   *
   * @param {string} userId Owner identifier.
   * @returns {Promise<PaymentMethod[]>} Collection of payment methods.
   */
  async findAllByUser(userId: string): Promise<PaymentMethod[]> {
    await this.ensureUserExists(userId);
    return this.paymentMethodRepository.findAllByUser(userId);
  }

  /**
   * Updates an existing payment method.
   * Validates that the payment method belongs to the specified user.
   * If details are provided without type, merges them with existing details.
   *
   * @param {string} id Payment method identifier.
   * @param {UpdatePaymentMethodDto} updateData Partial payment method data to update.
   * @param {string} userId User identifier to verify ownership.
   * @returns {Promise<PaymentMethod>} Updated payment method.
   * @throws {NotFoundError} If the payment method does not exist.
   * @throws {ForbiddenError} If the payment method does not belong to the user.
   */
  async update(id: string, updateData: UpdatePaymentMethodDto, userId: string): Promise<PaymentMethod> {
    const existingPaymentMethod = await this.ensurePaymentMethodOwnership(id, userId);
    
    // If details are provided without type, merge with existing details
    const finalUpdateData = { ...updateData };
    if (updateData.details !== undefined && updateData.type === undefined) {
      finalUpdateData.details = {
        ...existingPaymentMethod.details,
        ...updateData.details,
      };
    }
    
    const updatedPaymentMethod = await this.paymentMethodRepository.update(id, finalUpdateData);
    this.cache.del(cacheKeys.paymentMethods(userId)).catch(() => {});
    return updatedPaymentMethod;
  }

  /**
   * Deletes a payment method by identifier.
   * Validates that the payment method belongs to the specified user.
   *
   * @param {string} id Payment method identifier.
   * @param {string} userId User identifier to verify ownership.
   * @returns {Promise<void>} Resolves when deletion completes.
   * @throws {NotFoundError} If the payment method does not exist.
   * @throws {ForbiddenError} If the payment method does not belong to the user.
   */
  async delete(id: string, userId: string): Promise<void> {
    await this.ensurePaymentMethodOwnership(id, userId);
    await this.paymentMethodRepository.delete(id);
    this.cache.del(cacheKeys.paymentMethods(userId)).catch(() => {});
  }

  /**
   * Calculates the payment due date for a credit card transaction.
   * Business logic:
   * - If the payment method is NOT a credit card, returns null (paid immediately).
   * - If the transaction date is BEFORE the cut_off_day, the payment is due on payment_day of the CURRENT month.
   * - If the transaction date is ON or AFTER the cut_off_day, the payment is due on payment_day of the NEXT month.
   * - Handles year transitions (e.g., December to January).
   *
   * @param {string} paymentMethodId Payment method identifier.
   * @param {Date} transactionDate Date when the transaction occurred.
   * @returns {Promise<Date | null>} Payment due date for credit cards, null for other payment methods.
   * @throws {NotFoundError} If the payment method does not exist.
   */
  async calculatePaymentDueDate(paymentMethodId: string, transactionDate: Date): Promise<Date | null> {
    const paymentMethod = await this.paymentMethodRepository.findById(paymentMethodId);
    if (!paymentMethod) {
      throw new NotFoundError('PaymentMethod', paymentMethodId);
    }

    // If not a credit card, return null (paid immediately)
    if (paymentMethod.type !== PaymentMethodType.CREDIT_CARD) {
      return null;
    }

    const details = paymentMethod.details as CreditCardDetails;
    const cutOffDay = details.cut_off_day;
    const paymentDay = details.payment_day;

    // Get the day of the month from the transaction date
    const transactionDay = transactionDate.getDate();

    // Determine the year and month for the payment due date
    let paymentYear = transactionDate.getFullYear();
    let paymentMonth = transactionDate.getMonth(); // 0-indexed (0 = January, 11 = December)

    // If transaction was BEFORE the cut_off_day, payment is due this month
    // If transaction was ON or AFTER the cut_off_day, payment is due next month
    if (transactionDay >= cutOffDay) {
      // Transaction on or after cut_off_day -> payment due next month
      paymentMonth += 1;
      if (paymentMonth > 11) {
        // Handle year transition (December -> January)
        paymentMonth = 0;
        paymentYear += 1;
      }
    }
    // If transactionDay < cutOffDay, payment is due this month (no change needed)

    // Create the payment due date
    // Note: We use paymentDay, but need to handle cases where the day doesn't exist in the month
    // (e.g., payment_day = 31 but month has only 30 days)
    // We'll use the last day of the month if payment_day exceeds the month's length
    const daysInMonth = new Date(paymentYear, paymentMonth + 1, 0).getDate();
    const finalPaymentDay = Math.min(paymentDay, daysInMonth);

    return new Date(paymentYear, paymentMonth, finalPaymentDay);
  }

  async toggleGmfExempt(userId: string, paymentMethodId: string, isExempt: boolean): Promise<PaymentMethod> {
    const paymentMethod = await this.ensurePaymentMethodOwnership(paymentMethodId, userId);

    if (paymentMethod.type !== PaymentMethodType.BANK_ACCOUNT) {
      throw new ValidationError('Solo las cuentas bancarias pueden ser exentas del 4x1000');
    }

    const details = paymentMethod.details as BankAccountDetails;
    if (details.account_type !== BankAccountType.SAVINGS) {
      throw new ValidationError('Solo las cuentas de ahorros pueden ser exentas del 4x1000');
    }

    return this.paymentMethodRepository.update(paymentMethodId, {
      details: { ...details, is_gmf_exempt: isExempt },
    });
  }

  /**
   * Updates the balance of any payment method based on a transaction.
   *
   * CREDIT_CARD:
   *   - isExpense=true  → increases current_balance (more debt)
   *   - isExpense=false → decreases current_balance (payment reduces debt)
   *
   * BANK_ACCOUNT:
   *   - isExpense=true  → decreases current_balance (money leaves account)
   *   - isExpense=false → increases current_balance (money enters account)
   *
   * CASH:
   *   - isExpense=true  → decreases amount (cash spent)
   *   - isExpense=false → increases amount (cash received)
   *
   * @param {string} paymentMethodId Payment method identifier.
   * @param {number} transactionAmount Transaction amount to apply to the balance.
   * @param {boolean} isExpense Whether this is an expense (true) or income/reversal (false).
   * @returns {Promise<void>} Resolves when the balance is updated.
   * @throws {NotFoundError} If the payment method does not exist.
   */
  async updatePaymentMethodBalance(paymentMethodId: string, transactionAmount: number, isExpense: boolean): Promise<void> {
    const ctx = getRequestContext();
    const paymentMethod = await this.paymentMethodRepository.findById(paymentMethodId);
    if (!paymentMethod) {
      throw new NotFoundError('PaymentMethod', paymentMethodId);
    }

    logger.debug('Updating payment method balance', {
      ...ctx,
      paymentMethodId,
      type: paymentMethod.type,
      amount: transactionAmount,
      isExpense,
    });

    if (paymentMethod.type === PaymentMethodType.CREDIT_CARD) {
      const details = paymentMethod.details as CreditCardDetails;
      const currentBalance = details.current_balance || 0;
      const newBalance = isExpense
        ? currentBalance + transactionAmount
        : Math.max(0, currentBalance - transactionAmount);
      await this.paymentMethodRepository.update(paymentMethodId, {
        details: { ...details, current_balance: newBalance },
      });

    } else if (paymentMethod.type === PaymentMethodType.BANK_ACCOUNT) {
      const details = paymentMethod.details as BankAccountDetails;
      const currentBalance = details.current_balance || 0;
      const newBalance = isExpense
        ? currentBalance - transactionAmount
        : currentBalance + transactionAmount;
      await this.paymentMethodRepository.update(paymentMethodId, {
        details: { ...details, current_balance: newBalance },
      });

    } else if (paymentMethod.type === PaymentMethodType.CASH) {
      const details = paymentMethod.details as CashDetails;
      const currentAmount = details.amount || 0;
      const newAmount = isExpense
        ? currentAmount - transactionAmount
        : currentAmount + transactionAmount;
      await this.paymentMethodRepository.update(paymentMethodId, {
        details: { ...details, amount: newAmount },
      });
    }
  }

  /**
   * Ensures the provided user identifier exists in the persistence layer.
   *
   * @param {string} userId Owner identifier.
   * @returns {Promise<void>} Resolves if the user exists, otherwise throws.
   * @throws {NotFoundError} If the user does not exist.
   */
  private async ensureUserExists(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User', userId);
    }
  }

  /**
   * Ensures the provided payment method belongs to the specified user.
   *
   * @param {string} paymentMethodId Payment method identifier.
   * @param {string} userId User identifier to verify ownership.
   * @returns {Promise<PaymentMethod>} The payment method if it belongs to the user.
   * @throws {NotFoundError} If the payment method does not exist.
   * @throws {ForbiddenError} If the payment method does not belong to the user.
   */
  private async ensurePaymentMethodOwnership(paymentMethodId: string, userId: string): Promise<PaymentMethod> {
    const paymentMethod = await this.paymentMethodRepository.findById(paymentMethodId);
    if (!paymentMethod) {
      throw new NotFoundError('PaymentMethod', paymentMethodId);
    }
    if (paymentMethod.userId !== userId) {
      throw new ForbiddenError('No tienes permiso para acceder a este método de pago');
    }
    return paymentMethod;
  }
}

