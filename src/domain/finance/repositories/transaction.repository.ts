import { Transaction } from '../types/transaction.types';

/**
 * Filter options for querying transactions.
 */
export interface TransactionFilters {
  startDate?: Date;
  endDate?: Date;
  type?: string;
  categoryId?: string;
}

/**
 * Repository interface for Transaction persistence operations.
 */
export interface TransactionRepository {
  /**
   * Persists a new transaction.
   *
   * @param {Transaction} transaction Transaction data to persist.
   * @returns {Promise<Transaction>} Stored transaction.
   */
  create(transaction: Transaction): Promise<Transaction>;

  /**
   * Retrieves transactions for a user with optional filters.
   *
   * @param {string} userId Owner identifier.
   * @param {TransactionFilters} filters Optional filters for date range, type, category.
   * @returns {Promise<Transaction[]>} Collection of transactions ordered by date (descending).
   */
  findAllByUser(userId: string, filters?: TransactionFilters): Promise<Transaction[]>;

  /**
   * Finds a transaction by identifier.
   *
   * @param {string} id Transaction identifier.
   * @returns {Promise<Transaction | null>} Matching transaction or null.
   */
  findById(id: string): Promise<Transaction | null>;

  /**
   * Updates an existing transaction with the provided partial payload.
   *
   * @param {string} id Transaction identifier.
   * @param {Partial<Omit<Transaction, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>} data Fields to update.
   * @returns {Promise<Transaction | null>} Updated transaction or null when missing.
   */
  update(id: string, data: Partial<Omit<Transaction, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>): Promise<Transaction | null>;

  /**
   * Removes a transaction by identifier.
   *
   * @param {string} id Transaction identifier.
   * @returns {Promise<void>} Resolves once the transaction is deleted.
   */
  delete(id: string): Promise<void>;
}

