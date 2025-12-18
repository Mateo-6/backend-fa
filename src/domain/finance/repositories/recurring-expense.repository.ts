import { RecurringExpense } from '../types/recurring-expense.types';

/**
 * Repository interface for RecurringExpense persistence operations.
 */
export interface RecurringExpenseRepository {
  /**
   * Persists a new recurring expense.
   *
   * @param {RecurringExpense} recurringExpense Recurring expense data to persist.
   * @returns {Promise<RecurringExpense>} Stored recurring expense.
   */
  create(recurringExpense: RecurringExpense): Promise<RecurringExpense>;

  /**
   * Retrieves every recurring expense associated with the provided user.
   *
   * @param {string} userId Owner identifier.
   * @returns {Promise<RecurringExpense[]>} Collection of recurring expenses belonging to the user.
   */
  findAllByUser(userId: string): Promise<RecurringExpense[]>;

  /**
   * Finds a recurring expense by identifier.
   *
   * @param {string} id Recurring expense identifier.
   * @returns {Promise<RecurringExpense | null>} Matching recurring expense or null.
   */
  findById(id: string): Promise<RecurringExpense | null>;

  /**
   * Updates an existing recurring expense with the provided partial payload.
   *
   * @param {string} id Recurring expense identifier.
   * @param {Partial<Omit<RecurringExpense, 'id'>>} data Fields to update.
   * @returns {Promise<RecurringExpense | null>} Updated recurring expense or null when missing.
   */
  update(id: string, data: Partial<Omit<RecurringExpense, 'id'>>): Promise<RecurringExpense | null>;

  /**
   * Removes a recurring expense by identifier.
   *
   * @param {string} id Recurring expense identifier.
   * @returns {Promise<void>} Resolves once the recurring expense is deleted.
   */
  delete(id: string): Promise<void>;

  /**
   * Updates the next payment date for a recurring expense.
   *
   * @param {string} id Recurring expense identifier.
   * @param {Date} nextPaymentDate New next payment date.
   * @returns {Promise<RecurringExpense | null>} Updated recurring expense or null when missing.
   */
  updateNextPaymentDate(id: string, nextPaymentDate: Date): Promise<RecurringExpense | null>;

  /**
   * Finds all active recurring expenses that are due for payment.
   * Returns recurring expenses where nextPaymentDate is less than or equal to the provided date.
   *
   * @param {Date} date Date to check against (typically today's date).
   * @returns {Promise<RecurringExpense[]>} Collection of recurring expenses due for payment.
   */
  findDueForPayment(date: Date): Promise<RecurringExpense[]>;
}

