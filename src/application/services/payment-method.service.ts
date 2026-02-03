import { PaymentMethodRepository } from '../../domain/payment-method/repositories/payment-method.repository';
import { UserRepository } from '../../domain/user/repositories/user.repository';
import { CreatePaymentMethodDto } from '../dto/payment-method/create-payment-method.dto';
import { UpdatePaymentMethodDto } from '../dto/payment-method/update-payment-method.dto';
import { PaymentMethod, PaymentMethodType, CreditCardDetails } from '../../domain/payment-method/types/payment-method.types';
import { NotFoundError, ForbiddenError } from '../../domain/errors/app-error';

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
    private readonly userRepository: UserRepository
  ) {}

  /**
   * Creates a payment method after verifying the owner exists.
   *
   * @param {CreatePaymentMethodDto} data Validated payment method payload.
   * @param {string} userId User identifier obtained from JWT token.
   * @returns {Promise<PaymentMethod>} Newly created payment method.
   */
  async create(data: CreatePaymentMethodDto, userId: string): Promise<PaymentMethod> {
    await this.ensureUserExists(userId);
    return this.paymentMethodRepository.create({ ...data, userId, details: data.details || {} });
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
    
    return this.paymentMethodRepository.update(id, finalUpdateData);
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

  /**
   * Updates the credit card balance based on a transaction.
   * For EXPENSE transactions: adds the amount to the current balance (increases debt).
   * For INCOME transactions: subtracts the amount from the current balance (reduces debt).
   * Only updates if the payment method is a credit card.
   *
   * @param {string} paymentMethodId Payment method identifier.
   * @param {number} transactionAmount Transaction amount to apply to the balance.
   * @param {boolean} isExpense Whether this is an expense (true) or income (false) transaction.
   * @returns {Promise<void>} Resolves when the balance is updated.
   * @throws {NotFoundError} If the payment method does not exist.
   */
  async updateCreditCardBalance(paymentMethodId: string, transactionAmount: number, isExpense: boolean): Promise<void> {
    const paymentMethod = await this.paymentMethodRepository.findById(paymentMethodId);
    if (!paymentMethod) {
      throw new NotFoundError('PaymentMethod', paymentMethodId);
    }

    // Only update balance for credit cards
    if (paymentMethod.type !== PaymentMethodType.CREDIT_CARD) {
      return;
    }

    const details = paymentMethod.details as CreditCardDetails;
    const currentBalance = details.current_balance || 0;

    // Calculate new balance
    // For expenses: add to balance (more debt)
    // For income: subtract from balance (payment to card, reduces debt)
    const newBalance = isExpense 
      ? currentBalance + transactionAmount 
      : Math.max(0, currentBalance - transactionAmount); // Ensure balance doesn't go negative

    // Update the payment method with the new balance
    const updatedDetails: CreditCardDetails = {
      ...details,
      current_balance: newBalance,
    };

    await this.paymentMethodRepository.update(paymentMethodId, {
      details: updatedDetails,
    });
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

