import { Budget } from '../types/budget.types';

/**
 * Filter options for querying budgets.
 */
export interface BudgetFilters {
  isActive?: boolean;
  period?: string;
  categoryId?: string;
  includeExpired?: boolean;
}

/**
 * Filter options for querying budget history.
 */
export interface BudgetHistoryFilters {
  startDate?: Date;
  endDate?: Date;
  categoryId?: string;
}

/**
 * Repository interface for Budget persistence operations.
 */
export interface BudgetRepository {
  /**
   * Persists a new budget.
   *
   * @param {Budget} budget Budget data to persist.
   * @returns {Promise<Budget>} Stored budget.
   */
  create(budget: Budget): Promise<Budget>;

  /**
   * Finds a budget by identifier.
   *
   * @param {string} id Budget identifier.
   * @returns {Promise<Budget | null>} Matching budget or null.
   */
  findById(id: string): Promise<Budget | null>;

  /**
   * Retrieves budgets for a user with optional filters.
   *
   * @param {string} userId Owner identifier.
   * @param {BudgetFilters} filters Optional filters.
   * @returns {Promise<Budget[]>} Collection of budgets.
   */
  findAllByUser(userId: string, filters?: BudgetFilters): Promise<Budget[]>;

  /**
   * Retrieves active budgets for a user ordered by (spent/amount) descending.
   * Used for the dashboard summary widget.
   *
   * @param {string} userId Owner identifier.
   * @returns {Promise<Budget[]>} Active budgets sorted by consumption percentage.
   */
  findSummary(userId: string): Promise<Budget[]>;

  /**
   * Retrieves expired or inactive budgets for a user.
   * Used for the history view.
   *
   * @param {string} userId Owner identifier.
   * @param {BudgetHistoryFilters} filters Optional filters.
   * @returns {Promise<Budget[]>} Past budgets ordered by endDate descending.
   */
  findHistory(userId: string, filters?: BudgetHistoryFilters): Promise<Budget[]>;

  /**
   * Updates an existing budget with the provided partial payload.
   *
   * @param {string} id Budget identifier.
   * @param {Partial<Budget>} data Fields to update.
   * @returns {Promise<Budget | null>} Updated budget or null when missing.
   */
  update(id: string, data: Partial<Budget>): Promise<Budget | null>;

  /**
   * Finds active budgets that match a given transaction (by user, category, and date).
   * Returns both category-specific budgets and global budgets (categoryId === null).
   *
   * @param {string} userId User identifier.
   * @param {string} categoryId Category identifier of the transaction.
   * @param {Date} date Date of the transaction.
   * @returns {Promise<Budget[]>} Matching active budgets.
   */
  findMatchingBudgets(userId: string, categoryId: string, date: Date): Promise<Budget[]>;

  /**
   * Permanently removes a budget from the database.
   *
   * @param {string} id Budget identifier.
   * @returns {Promise<void>} Resolves when deleted.
   */
  deleteById(id: string): Promise<void>;
}
