/**
 * Transaction type enumeration.
 */
export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

/**
 * Category snapshot embedded in transactions to avoid lookups.
 */
export interface CategorySnapshot {
  id: string;
  name: string;
  icon?: string;
}

/**
 * Transaction entity representing a real money movement (Income or Expense).
 */
export interface Transaction {
  id?: string;
  userId: string;
  amount: number;
  description: string;
  date: Date;
  type: TransactionType;
  category: CategorySnapshot; // Embedded snapshot to avoid lookups
  isRecurring: boolean;
  recurringExpenseId?: string; // Optional reference to RecurringExpense
  createdAt?: Date;
  updatedAt?: Date;
}

