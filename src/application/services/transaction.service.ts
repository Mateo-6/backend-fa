import { TransactionRepository } from '../../domain/finance/repositories/transaction.repository';
import { RecurringExpenseRepository } from '../../domain/finance/repositories/recurring-expense.repository';
import { CategoryRepository } from '../../domain/category/repositories/category.repository';
import { UserRepository } from '../../domain/user/repositories/user.repository';
import { PaymentMethodRepository } from '../../domain/payment-method/repositories/payment-method.repository';
import { PaymentMethodService } from './payment-method.service';
import { BudgetService } from './budget.service';
import { CreateTransactionDto } from '../dto/finance/create-transaction.dto';
import { UpdateTransactionDto } from '../dto/finance/update-transaction.dto';
import { Transaction, TransactionType, CategorySnapshot } from '../../domain/finance/types/transaction.types';
import { RecurringExpense, RecurringFrequency } from '../../domain/finance/types/recurring-expense.types';
import { CategoryType } from '../../domain/category/types/category.types';
import { NotFoundError, ForbiddenError } from '../../domain/errors/app-error';
import { TransactionSubtype, PaymentMethodType } from 'fa-contracts';

/**
 * Filter options for querying transactions.
 */
export interface TransactionHistoryFilters {
  startDate?: Date;
  endDate?: Date;
  type?: TransactionType;
  categoryId?: string;
  /** Filter by payment method identifier. */
  paymentMethodId?: string;
  /** Filter by transaction subtype. */
  subtype?: string | null;
  /** When true, excludes CARD_PAYMENT transactions. */
  excludeCardPayments?: boolean;
}

/**
 * Service for managing transactions.
 */
export class TransactionService {
  /**
   * @param {TransactionRepository} transactionRepository Repository for transaction persistence.
   * @param {RecurringExpenseRepository} recurringExpenseRepository Repository for recurring expense operations.
   * @param {CategoryRepository} categoryRepository Repository for category lookups.
   * @param {UserRepository} userRepository Repository used to validate the owner existence.
   * @param {PaymentMethodRepository} paymentMethodRepository Repository used to validate payment method existence.
   * @param {PaymentMethodService} paymentMethodService Service used to update credit card balance.
   * @param {BudgetService} [budgetService] Optional service used to recalculate budget spent on EXPENSE changes.
   */
  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly recurringExpenseRepository: RecurringExpenseRepository,
    private readonly categoryRepository: CategoryRepository,
    private readonly userRepository: UserRepository,
    private readonly paymentMethodRepository: PaymentMethodRepository,
    private readonly paymentMethodService: PaymentMethodService,
    private readonly budgetService?: BudgetService
  ) {}

  /**
   * Creates a manual transaction (not from a recurring expense).
   * Validates the category and creates a snapshot of it in the transaction.
   * Payment method is validated only for EXPENSE transactions.
   *
   * @param {CreateTransactionDto} data Validated transaction payload.
   * @param {string} userId User identifier obtained from JWT token.
   * @returns {Promise<Transaction>} Newly created transaction.
   * @throws {NotFoundError} If the user or category does not exist.
   * @throws {ForbiddenError} If the category does not belong to the user.
   */
  async createManual(data: CreateTransactionDto, userId: string): Promise<Transaction> {
    await this.ensureUserExists(userId);

    const category = await this.categoryRepository.findById(data.categoryId);
    if (!category) {
      throw new NotFoundError('Category', data.categoryId);
    }

    if (category.userId !== userId) {
      throw new ForbiddenError('No tienes permiso para usar esta categoría');
    }

    // Validate that category type matches transaction type
    const expectedCategoryType = data.type === TransactionType.INCOME ? CategoryType.INCOME : CategoryType.EXPENSE;
    if (category.type !== expectedCategoryType) {
      throw new ForbiddenError(`El tipo de categoría "${category.type}" no coincide con el tipo de transacción "${data.type}"`);
    }

    // Validate payment method ownership when provided for any transaction type
    if (data.paymentMethodId) {
      await this.ensurePaymentMethodExists(data.paymentMethodId, userId);

      // INCOME transactions can only be linked to BANK_ACCOUNT or CASH, not CREDIT_CARD
      if (data.type === TransactionType.INCOME) {
        const paymentMethod = await this.paymentMethodRepository.findById(data.paymentMethodId);
        if (paymentMethod && paymentMethod.type === PaymentMethodType.CREDIT_CARD) {
          throw new ForbiddenError('Los ingresos no pueden asociarse a una tarjeta de crédito');
        }
      }
    }

    const categorySnapshot: CategorySnapshot = {
      id: category.id!,
      name: category.name,
      icon: undefined, // Add icon field to Category type if needed
    };

    // Ensure date is a Date object (Zod transforms string to Date)
    const transactionDate = data.date instanceof Date ? data.date : new Date(data.date);

    const transaction = await this.transactionRepository.create({
      userId,
      amount: data.amount,
      description: data.description,
      date: transactionDate,
      type: data.type,
      category: categorySnapshot,
      paymentMethodId: data.paymentMethodId,
      isRecurring: false,
    });

    // Update credit card balance if payment method is provided
    if (data.paymentMethodId) {
      const isExpense = data.type === TransactionType.EXPENSE;
      await this.paymentMethodService.updatePaymentMethodBalance(
        data.paymentMethodId,
        data.amount,
        isExpense
      );
    }

    // Recalculate affected budgets when an EXPENSE is created
    if (data.type === TransactionType.EXPENSE && this.budgetService) {
      await this.budgetService.updateBudgetsForTransaction(userId, data.categoryId, transactionDate);
    }

    return transaction;
  }

  /**
   * Processes a payment from a recurring expense.
   * Creates a transaction based on the recurring expense configuration and updates the next payment date.
   *
   * @param {string} userId User identifier.
   * @param {string} recurringExpenseId Recurring expense identifier.
   * @returns {Promise<Transaction>} Created transaction from the recurring expense.
   * @throws {NotFoundError} If the recurring expense does not exist.
   * @throws {ForbiddenError} If the recurring expense does not belong to the user.
   */
  async processRecurringPayment(userId: string, recurringExpenseId: string): Promise<Transaction> {
    const recurringExpense = await this.recurringExpenseRepository.findById(recurringExpenseId);
    if (!recurringExpense) {
      throw new NotFoundError('RecurringExpense', recurringExpenseId);
    }

    if (recurringExpense.userId !== userId) {
      throw new ForbiddenError('No tienes permiso para acceder a este gasto recurrente');
    }

    if (!recurringExpense.isActive) {
      throw new ForbiddenError('Este gasto recurrente no está activo');
    }

    // Get category to create snapshot
    const category = await this.categoryRepository.findById(recurringExpense.categoryId);
    if (!category) {
      throw new NotFoundError('Category', recurringExpense.categoryId);
    }

    // Validate that category type matches transaction type (recurring expenses are always EXPENSE)
    if (category.type !== CategoryType.EXPENSE) {
      throw new ForbiddenError(`El tipo de categoría "${category.type}" no coincide con el tipo de transacción "EXPENSE"`);
    }

    const categorySnapshot: CategorySnapshot = {
      id: category.id!,
      name: category.name,
      icon: undefined, // Add icon field to Category type if needed
    };

    // Validate payment method
    await this.ensurePaymentMethodExists(recurringExpense.paymentMethodId, recurringExpense.userId);

    // Create transaction
    const transaction = await this.transactionRepository.create({
      userId: recurringExpense.userId,
      amount: recurringExpense.amount,
      description: recurringExpense.name,
      date: new Date(),
      type: TransactionType.EXPENSE,
      category: categorySnapshot,
      paymentMethodId: recurringExpense.paymentMethodId,
      isRecurring: true,
      recurringExpenseId: recurringExpense.id,
    });

    // Calculate and update next payment date
    const nextPaymentDate = this.calculateNextPaymentDate(
      new Date(),
      recurringExpense.payDay,
      recurringExpense.frequency
    );
    await this.recurringExpenseRepository.updateNextPaymentDate(recurringExpenseId, nextPaymentDate);

    // Update credit card balance (recurring expenses are always EXPENSE transactions)
    if (recurringExpense.paymentMethodId) {
      await this.paymentMethodService.updatePaymentMethodBalance(
        recurringExpense.paymentMethodId,
        recurringExpense.amount,
        true // Recurring expenses are always expenses
      );
    }

    // Recalculate affected budgets for the recurring EXPENSE
    if (this.budgetService) {
      await this.budgetService.updateBudgetsForTransaction(
        recurringExpense.userId,
        recurringExpense.categoryId,
        new Date()
      );
    }

    return transaction;
  }

  /**
   * Retrieves transaction history for a user with optional filters.
   * When `startDate` is not provided, defaults to the first day of the current month at 00:00:00.
   * When `endDate` is not provided, defaults to the current day at 23:59:59.999.
   *
   * @param {string} userId User identifier.
   * @param {TransactionHistoryFilters} filters Optional filters for date range, type, category.
   * @returns {Promise<Transaction[]>} Collection of transactions ordered by date (descending).
   * @throws {NotFoundError} If the user does not exist.
   */
  async getHistory(userId: string, filters?: TransactionHistoryFilters): Promise<Transaction[]> {
    await this.ensureUserExists(userId);

    const now = new Date();
    const defaultStartDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const defaultEndDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const repositoryFilters = {
      startDate: filters?.startDate ?? defaultStartDate,
      endDate: filters?.endDate ?? defaultEndDate,
      type: filters?.type,
      categoryId: filters?.categoryId,
      paymentMethodId: filters?.paymentMethodId,
      subtype: filters?.subtype,
      excludeCardPayments: filters?.excludeCardPayments,
    };

    return this.transactionRepository.findAllByUser(userId, repositoryFilters);
  }

  /**
   * Updates an INCOME or EXPENSE transaction by identifier.
   * Validates that the transaction belongs to the specified user.
   * For EXPENSE transactions, credit card balance is adjusted when amount or payment method changes.
   *
   * @param {string} id Transaction identifier.
   * @param {UpdateTransactionDto} data Partial payload with the updated fields.
   * @param {string} userId User identifier to verify ownership.
   * @returns {Promise<Transaction>} Updated transaction.
   * @throws {NotFoundError} If the transaction does not exist.
   * @throws {ForbiddenError} If the transaction does not belong to the user.
   */
  async update(id: string, data: UpdateTransactionDto, userId: string): Promise<Transaction> {
    const transaction = await this.transactionRepository.findById(id);
    if (!transaction) {
      throw new NotFoundError('Transaction', id);
    }

    if (transaction.userId !== userId) {
      throw new ForbiddenError('No tienes permiso para actualizar esta transacción');
    }

    const expectedCategoryType = transaction.type === TransactionType.INCOME ? CategoryType.INCOME : CategoryType.EXPENSE;

    // Prepare update data
    const updateData: Partial<Omit<Transaction, 'id' | 'userId' | 'createdAt' | 'updatedAt'>> = {};

    if (typeof data.amount === 'number') {
      updateData.amount = data.amount;
    }
    if (typeof data.description === 'string') {
      updateData.description = data.description;
    }
    if (data.date instanceof Date) {
      updateData.date = data.date;
    }

    // Handle category update
    if (data.categoryId) {
      const category = await this.categoryRepository.findById(data.categoryId);
      if (!category) {
        throw new NotFoundError('Category', data.categoryId);
      }
      if (category.userId !== userId) {
        throw new ForbiddenError('No tienes permiso para usar esta categoría');
      }
      if (category.type !== expectedCategoryType) {
        throw new ForbiddenError(`El tipo de categoría "${category.type}" no coincide con el tipo de transacción "${transaction.type}"`);
      }
      updateData.category = {
        id: category.id!,
        name: category.name,
        icon: undefined,
      };
    }

    // Handle payment method update
    if (data.paymentMethodId !== undefined) {
      if (data.paymentMethodId) {
        await this.ensurePaymentMethodExists(data.paymentMethodId, userId);
        updateData.paymentMethodId = data.paymentMethodId;
      } else {
        updateData.paymentMethodId = undefined;
      }
    }

    const finalAmount = typeof data.amount === 'number' ? data.amount : transaction.amount;
    const finalPaymentMethodId = data.paymentMethodId !== undefined ? data.paymentMethodId : transaction.paymentMethodId;

    // Reverse old balance effect before update (handles both EXPENSE and INCOME)
    if (transaction.paymentMethodId) {
      const isOriginalExpense = transaction.type === TransactionType.EXPENSE;
      await this.paymentMethodService.updatePaymentMethodBalance(
        transaction.paymentMethodId,
        transaction.amount,
        !isOriginalExpense // flip to reverse: EXPENSE reversal = false, INCOME reversal = true
      );
    }

    const updatedTransaction = await this.transactionRepository.update(id, updateData);
    if (!updatedTransaction) {
      // Rollback: re-apply the old effect we reversed
      if (transaction.paymentMethodId) {
        const isOriginalExpense = transaction.type === TransactionType.EXPENSE;
        await this.paymentMethodService.updatePaymentMethodBalance(
          transaction.paymentMethodId,
          transaction.amount,
          isOriginalExpense
        );
      }
      throw new NotFoundError('Transaction', id);
    }

    // Apply new balance effect
    if (finalPaymentMethodId) {
      const isExpense = transaction.type === TransactionType.EXPENSE;
      await this.paymentMethodService.updatePaymentMethodBalance(
        finalPaymentMethodId,
        finalAmount,
        isExpense
      );
    }

    // Recalculate affected budgets when an EXPENSE is updated
    if (transaction.type === TransactionType.EXPENSE && this.budgetService) {
      const updatedCategoryId = updateData.category?.id ?? transaction.category.id;
      const updatedDate = updateData.date ?? transaction.date;
      await this.budgetService.updateBudgetsForTransaction(userId, updatedCategoryId, updatedDate);
    }

    return updatedTransaction;
  }

  /**
   * Deletes a transaction by identifier.
   * Validates that the transaction belongs to the specified user.
   *
   * @param {string} id Transaction identifier.
   * @param {string} userId User identifier to verify ownership.
   * @returns {Promise<void>} Resolves when deletion completes.
   * @throws {NotFoundError} If the transaction does not exist.
   * @throws {ForbiddenError} If the transaction does not belong to the user.
   */
  async delete(id: string, userId: string): Promise<void> {
    const transaction = await this.transactionRepository.findById(id);
    if (!transaction) {
      throw new NotFoundError('Transaction', id);
    }
    if (transaction.userId !== userId) {
      throw new ForbiddenError('No tienes permiso para eliminar esta transacción');
    }

    // Reverse balance effect before deleting
    if (transaction.subtype === TransactionSubtype.CARD_PAYMENT && transaction.cardPaymentDetails) {
      // CARD_PAYMENT reduces the card's balance. Reversing: increase the card balance back.
      const cardId = transaction.cardPaymentDetails.creditCardId;
      await this.paymentMethodService.updatePaymentMethodBalance(cardId, transaction.amount, true);
    } else if (transaction.paymentMethodId) {
      // For EXPENSE: reverse = pass false (undo the balance decrease / debt increase)
      // For INCOME: reverse = pass true (undo the balance increase)
      const isOriginalExpense = transaction.type === TransactionType.EXPENSE;
      await this.paymentMethodService.updatePaymentMethodBalance(
        transaction.paymentMethodId,
        transaction.amount,
        !isOriginalExpense
      );
    }

    await this.transactionRepository.delete(id);

    // Recalculate affected budgets when an EXPENSE is deleted
    if (transaction.type === TransactionType.EXPENSE && this.budgetService) {
      await this.budgetService.updateBudgetsForTransaction(userId, transaction.category.id, transaction.date);
    }
  }

  /**
   * Calculates the next payment date based on current date, pay day, and frequency.
   *
   * @param {Date} currentDate Current date.
   * @param {number} payDay Day of the month when payment should occur (1-31).
   * @param {RecurringFrequency} frequency Frequency of the payment (WEEKLY, MONTHLY, YEARLY).
   * @returns {Date} Calculated next payment date.
   */
  private calculateNextPaymentDate(currentDate: Date, payDay: number, frequency: RecurringFrequency): Date {
    let nextDate = new Date(currentDate);

    switch (frequency) {
      case RecurringFrequency.WEEKLY:
        nextDate.setDate(currentDate.getDate() + 7);
        break;

      case RecurringFrequency.MONTHLY:
        nextDate.setMonth(currentDate.getMonth() + 1);
        nextDate.setDate(payDay);
        // Handle months with fewer days (e.g., Feb 31 -> Feb 28/29)
        if (nextDate.getDate() !== payDay) {
          nextDate.setDate(0); // Last day of previous month
        }
        break;

      case RecurringFrequency.YEARLY:
        nextDate.setFullYear(currentDate.getFullYear() + 1);
        nextDate.setDate(payDay);
        // Handle leap years and months with fewer days
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
      throw new ForbiddenError('No tienes permiso para usar este método de pago');
    }
  }
}

