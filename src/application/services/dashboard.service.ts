import { TransactionRepository } from '../../domain/finance/repositories/transaction.repository';
import { RecurringExpenseRepository } from '../../domain/finance/repositories/recurring-expense.repository';
import { Transaction, TransactionType } from '../../domain/finance/types/transaction.types';
import { RecurringExpense } from '../../domain/finance/types/recurring-expense.types';

/**
 * Dashboard summary data with financial metrics.
 */
export interface DashboardSummary {
  totalBalance: number;
  totalIncome: number;
  totalExpenses: number;
}

/**
 * Complete dashboard data response.
 */
export interface DashboardData {
  summary: DashboardSummary;
  recentTransactions: Transaction[];
  upcomingPayments: RecurringExpense[];
}

/**
 * Service for managing dashboard data and calculations.
 * All financial calculations are performed server-side to avoid frontend computation.
 */
export class DashboardService {
  /**
   * @param {TransactionRepository} transactionRepository Repository for transaction data access.
   * @param {RecurringExpenseRepository} recurringExpenseRepository Repository for recurring expense data access.
   */
  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly recurringExpenseRepository: RecurringExpenseRepository
  ) {}

  /**
   * Retrieves complete dashboard data for a user.
   * Calculates financial summary, recent transactions, and upcoming payments.
   *
   * @param {string} userId User identifier.
   * @returns {Promise<DashboardData>} Complete dashboard data including summary, recent transactions, and upcoming payments.
   */
  async getDashboardData(userId: string): Promise<DashboardData> {
    // Fetch all transactions and recurring expenses for dashboard calculations
    const [allTransactions, allRecurringExpenses] = await Promise.all([
      this.transactionRepository.findAllByUser(userId),
      this.recurringExpenseRepository.findAllByUser(userId),
    ]);

    // Calculate financial summary
    const summary = this.calculateSummary(allTransactions);

    // Get recent transactions (last 10, ordered by date descending)
    const recentTransactions = allTransactions.slice(0, 10);

    // Get upcoming payments (active recurring expenses, sorted by nextPaymentDate, limit to next 10)
    const upcomingPayments = allRecurringExpenses
      .filter((re) => re.isActive)
      .sort((a, b) => a.nextPaymentDate.getTime() - b.nextPaymentDate.getTime())
      .slice(0, 10);

    return {
      summary,
      recentTransactions,
      upcomingPayments,
    };
  }

  /**
   * Calculates the financial summary from transactions.
   * Computes total income, total expenses, and balance (income - expenses).
   *
   * @param {Transaction[]} transactions Array of user transactions.
   * @returns {DashboardSummary} Object containing totalBalance, totalIncome, and totalExpenses.
   */
  private calculateSummary(transactions: Transaction[]): DashboardSummary {
    let totalIncome = 0;
    let totalExpenses = 0;

    transactions.forEach((transaction) => {
      if (transaction.type === TransactionType.INCOME) {
        totalIncome += transaction.amount;
      } else if (transaction.type === TransactionType.EXPENSE) {
        totalExpenses += transaction.amount;
      }
    });

    const totalBalance = totalIncome - totalExpenses;

    return {
      totalBalance,
      totalIncome,
      totalExpenses,
    };
  }
}

