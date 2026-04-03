import { TransactionRepository } from '../../domain/finance/repositories/transaction.repository';
import { RecurringExpenseRepository } from '../../domain/finance/repositories/recurring-expense.repository';
import { PaymentMethodRepository } from '../../domain/payment-method/repositories/payment-method.repository';
import { Transaction, TransactionType } from '../../domain/finance/types/transaction.types';
import { RecurringExpense } from '../../domain/finance/types/recurring-expense.types';
import { TransactionSubtype, PaymentMethodType, BankAccountDetails, CashDetails } from 'fa-contracts';
import { CreditCardService, CreditCardSummary } from './credit-card.service';

/**
 * Dashboard summary data with financial metrics.
 */
export interface DashboardSummary {
  totalBalance: number;
  totalIncome: number;
  totalExpenses: number;
  /** Sum of current_balance from all BANK_ACCOUNT methods + amount from all CASH methods. */
  availableBalance: number;
}

/**
 * Complete dashboard data response.
 */
export interface DashboardData {
  summary: DashboardSummary;
  recentTransactions: Transaction[];
  upcomingPayments: RecurringExpense[];
  /** Up to 3 credit cards sorted by daysUntilPayment (most urgent first). */
  creditCards: CreditCardSummary[];
}

/**
 * Service for managing dashboard data and calculations.
 * All financial calculations are performed server-side to avoid frontend computation.
 */
export class DashboardService {
  /**
   * @param {TransactionRepository} transactionRepository Repository for transaction data access.
   * @param {RecurringExpenseRepository} recurringExpenseRepository Repository for recurring expense data access.
   * @param {CreditCardService} creditCardService Service for credit card summary data.
   */
  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly recurringExpenseRepository: RecurringExpenseRepository,
    private readonly creditCardService: CreditCardService,
    private readonly paymentMethodRepository: PaymentMethodRepository
  ) {}

  /**
   * Retrieves complete dashboard data for a user.
   * Transactions are scoped to the current month (from day 1 to today) to reflect
   * the current period's financial performance. Upcoming payments are not date-filtered.
   *
   * @param {string} userId User identifier.
   * @returns {Promise<DashboardData>} Complete dashboard data including summary, recent transactions, and upcoming payments.
   */
  async getDashboardData(userId: string): Promise<DashboardData> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const [{ items: allTransactions }, allRecurringExpenses, creditCards, paymentMethods] = await Promise.all([
      this.transactionRepository.findAllByUser(userId, {
        startDate: startOfMonth,
        endDate: endOfToday,
        excludeCardPayments: true,
      }),
      this.recurringExpenseRepository.findAllByUser(userId),
      this.creditCardService.getAllCards(userId),
      this.paymentMethodRepository.findAllByUser(userId),
    ]);

    // Calculate available balance from bank accounts and cash
    const availableBalance = paymentMethods.reduce((total, pm) => {
      if (pm.type === PaymentMethodType.BANK_ACCOUNT) {
        return total + ((pm.details as BankAccountDetails).current_balance || 0);
      }
      if (pm.type === PaymentMethodType.CASH) {
        return total + ((pm.details as CashDetails).amount || 0);
      }
      return total;
    }, 0);

    // Calculate financial summary (CARD_PAYMENT transactions excluded to avoid double-counting)
    const summary = this.calculateSummary(allTransactions, availableBalance);

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
      creditCards: creditCards.slice(0, 3),
    };
  }

  /**
   * Calculates the financial summary from transactions.
   * Computes total income, total expenses, and balance (income - expenses).
   *
   * @param {Transaction[]} transactions Array of user transactions.
   * @returns {DashboardSummary} Object containing totalBalance, totalIncome, and totalExpenses.
   */
  private calculateSummary(transactions: Transaction[], availableBalance: number): DashboardSummary {
    let totalIncome = 0;
    let totalExpenses = 0;

    transactions.forEach((transaction) => {
      // CARD_PAYMENT transactions are already excluded at the repository level (excludeCardPayments filter)
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
      availableBalance,
    };
  }
}

