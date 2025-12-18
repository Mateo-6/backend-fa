import { RecurringExpenseRepository } from '../../domain/finance/repositories/recurring-expense.repository';
import { UserRepository } from '../../domain/user/repositories/user.repository';
import { PaymentMethodRepository } from '../../domain/payment-method/repositories/payment-method.repository';
import { CreateRecurringDto } from '../dto/finance/create-recurring.dto';
import { RecurringExpense, RecurringFrequency } from '../../domain/finance/types/recurring-expense.types';
import { NotFoundError, ForbiddenError } from '../../domain/errors/app-error';

/**
 * Service for managing recurring expenses.
 */
export class RecurringExpenseService {
  /**
   * @param {RecurringExpenseRepository} recurringExpenseRepository Repository for recurring expense persistence.
   * @param {UserRepository} userRepository Repository used to validate the owner existence.
   * @param {PaymentMethodRepository} paymentMethodRepository Repository used to validate payment method existence.
   */
  constructor(
    private readonly recurringExpenseRepository: RecurringExpenseRepository,
    private readonly userRepository: UserRepository,
    private readonly paymentMethodRepository: PaymentMethodRepository
  ) {}

  /**
   * Creates a new recurring expense and calculates the first next payment date.
   *
   * @param {CreateRecurringDto} data Validated recurring expense payload.
   * @param {string} userId User identifier obtained from JWT token.
   * @returns {Promise<RecurringExpense>} Newly created recurring expense.
   * @throws {NotFoundError} If the user does not exist.
   */
  async create(data: CreateRecurringDto, userId: string): Promise<RecurringExpense> {
    await this.ensureUserExists(userId);
    await this.ensurePaymentMethodExists(data.paymentMethodId, userId);

    const startDate: Date = typeof data.startDate === 'string' ? new Date(data.startDate) : data.startDate;
    const nextPaymentDate = this.calculateNextPaymentDate(startDate, data.payDay, data.frequency);

    return this.recurringExpenseRepository.create({
      ...data,
      userId,
      nextPaymentDate,
      isActive: true,
      startDate, // ensure startDate is Date
    });
  }

  /**
   * Retrieves all recurring expenses for a user.
   *
   * @param {string} userId User identifier.
   * @returns {Promise<RecurringExpense[]>} Collection of recurring expenses.
   * @throws {NotFoundError} If the user does not exist.
   */
  async findAllByUser(userId: string): Promise<RecurringExpense[]> {
    await this.ensureUserExists(userId);
    return this.recurringExpenseRepository.findAllByUser(userId);
  }

  /**
   * Updates a recurring expense.
   * Validates that the recurring expense belongs to the specified user.
   *
   * @param {string} id Recurring expense identifier.
   * @param {Partial<Omit<RecurringExpense, 'id'>>} data Partial payload with the updated fields.
   * @param {string} userId User identifier to verify ownership.
   * @returns {Promise<RecurringExpense>} Updated recurring expense.
   * @throws {NotFoundError} If the recurring expense does not exist.
   * @throws {ForbiddenError} If the recurring expense does not belong to the user.
   */
  async update(id: string, data: Partial<Omit<RecurringExpense, 'id'>>, userId: string): Promise<RecurringExpense> {
    await this.ensureRecurringExpenseOwnership(id, userId);
    const updated = await this.recurringExpenseRepository.update(id, data);
    if (!updated) {
      throw new NotFoundError('RecurringExpense', id);
    }
    return updated;
  }

  /**
   * Deletes a recurring expense by identifier.
   * Validates that the recurring expense belongs to the specified user.
   *
   * @param {string} id Recurring expense identifier.
   * @param {string} userId User identifier to verify ownership.
   * @returns {Promise<void>} Resolves when deletion completes.
   * @throws {NotFoundError} If the recurring expense does not exist.
   * @throws {ForbiddenError} If the recurring expense does not belong to the user.
   */
  async delete(id: string, userId: string): Promise<void> {
    await this.ensureRecurringExpenseOwnership(id, userId);
    await this.recurringExpenseRepository.delete(id);
  }

  /**
   * Calculates the next payment date based on start date, pay day, and frequency.
   *
   * @param {Date} startDate Start date of the recurring expense.
   * @param {number} payDay Day of the month when payment should occur (1-31). 
   *                        - WEEKLY: This value is ignored (not used in calculation)
   *                        - MONTHLY: Day of each month when payment occurs
   *                        - YEARLY: Day of the month, preserving the month from startDate
   * @param {RecurringFrequency} frequency Frequency of the payment (WEEKLY, MONTHLY, YEARLY).
   * @returns {Date} Calculated next payment date.
   */
  private calculateNextPaymentDate(startDate: Date, payDay: number, frequency: RecurringFrequency): Date {
    const now = new Date();
    let nextDate: Date;

    switch (frequency) {
      case RecurringFrequency.WEEKLY:
        // For weekly, add 7 days from start date (or from now if start date is in the past)
        // Note: payDay parameter is ignored for WEEKLY frequency
        if (startDate > now) {
          nextDate = new Date(startDate);
        } else {
          nextDate = new Date(now);
          nextDate.setDate(now.getDate() + 7);
        }
        break;

      case RecurringFrequency.MONTHLY:
        // For monthly, use the pay day of the month
        if (startDate > now) {
          nextDate = new Date(startDate);
          nextDate.setDate(payDay);
          // If the adjusted date is before start date, move to next month
          if (nextDate < startDate) {
            nextDate.setMonth(nextDate.getMonth() + 1);
            nextDate.setDate(payDay);
          }
        } else {
          nextDate = new Date(now);
          nextDate.setMonth(now.getMonth() + 1);
          nextDate.setDate(payDay);
        }
        // Handle months with fewer days (e.g., Feb 31 -> Feb 28/29)
        if (nextDate.getDate() !== payDay) {
          nextDate.setDate(0); // Last day of previous month
        }
        break;

      case RecurringFrequency.YEARLY:
        // For yearly, use the pay day of the same month as startDate in the next year
        // This preserves the month from startDate (e.g., if startDate is January, next payment is also in January)
        if (startDate > now) {
          nextDate = new Date(startDate);
          nextDate.setDate(payDay);
          // If the adjusted date is before start date, move to next year
          if (nextDate < startDate) {
            nextDate.setFullYear(nextDate.getFullYear() + 1);
            nextDate.setDate(payDay);
          }
        } else {
          // Preserve the month from startDate, but calculate for next year
          nextDate = new Date(startDate);
          const targetYear = now.getFullYear() + 1;
          // Check if the target date has already passed this year, if so use next year
          const thisYearDate = new Date(startDate);
          thisYearDate.setFullYear(now.getFullYear());
          thisYearDate.setDate(payDay);
          
          if (thisYearDate > now) {
            // Same month this year hasn't passed yet, use this year
            nextDate = thisYearDate;
          } else {
            // Same month this year has passed, use next year
            nextDate.setFullYear(targetYear);
            nextDate.setDate(payDay);
          }
        }
        // Handle leap years and months with fewer days (e.g., Feb 31 -> Feb 28/29)
        if (nextDate.getDate() !== payDay) {
          nextDate.setDate(0); // Last day of previous month
        }
        break;
    }

    return nextDate;
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
   * Ensures the provided recurring expense belongs to the specified user.
   *
   * @param {string} recurringExpenseId Recurring expense identifier.
   * @param {string} userId User identifier to verify ownership.
   * @returns {Promise<RecurringExpense>} The recurring expense if it belongs to the user.
   * @throws {NotFoundError} If the recurring expense does not exist.
   * @throws {ForbiddenError} If the recurring expense does not belong to the user.
   */
  private async ensureRecurringExpenseOwnership(
    recurringExpenseId: string,
    userId: string
  ): Promise<RecurringExpense> {
    const recurringExpense = await this.recurringExpenseRepository.findById(recurringExpenseId);
    if (!recurringExpense) {
      throw new NotFoundError('RecurringExpense', recurringExpenseId);
    }
    if (recurringExpense.userId !== userId) {
      throw new ForbiddenError('You do not have permission to access this recurring expense');
    }
    return recurringExpense;
  }

  /**
   * Ensures the provided payment method exists and belongs to the specified user.
   *
   * @param {string} paymentMethodId Payment method identifier.
   * @param {string} userId User identifier to verify ownership.
   * @returns {Promise<void>} Resolves if the payment method exists and belongs to the user.
   * @throws {NotFoundError} If the payment method does not exist.
   * @throws {ForbiddenError} If the payment method does not belong to the user.
   */
  private async ensurePaymentMethodExists(paymentMethodId: string, userId: string): Promise<void> {
    const paymentMethod = await this.paymentMethodRepository.findById(paymentMethodId);
    if (!paymentMethod) {
      throw new NotFoundError('PaymentMethod', paymentMethodId);
    }
    if (paymentMethod.userId !== userId) {
      throw new ForbiddenError('You do not have permission to use this payment method');
    }
  }
}

