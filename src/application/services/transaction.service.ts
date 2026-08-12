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
import { NotFoundError, ForbiddenError, ValidationError } from '../../domain/errors/app-error';
import { ITransactionRunner } from '../../domain/shared/transaction-runner.interface';
import { TransactionSubtype, PaymentMethodType, BankAccountDetails, CreditCardDetails } from 'fa-contracts';
import { logger } from '../../infra/utils/logger';
import { getRequestContext } from '../../infra/http/middleware/request-context';

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
  /** Maximum number of results to return (default 50). */
  limit?: number;
  /** Number of results to skip (default 0). */
  offset?: number;
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
    private readonly transactionRunner: ITransactionRunner,
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
    const ctx = getRequestContext();
    logger.debug('Validating manual transaction', { ...ctx, type: data.type, amount: data.amount, categoryId: data.categoryId });

    await this.ensureUserExists(userId);

    const category = await this.categoryRepository.findById(data.categoryId);
    if (!category) {
      throw new NotFoundError('Category', data.categoryId);
    }

    if (category.userId !== userId) {
      logger.warn('Category does not belong to user', { ...ctx, categoryId: data.categoryId });
      throw new ForbiddenError('No tienes permiso para usar esta categoría');
    }

    // Validate that category type matches transaction type
    let expectedCategoryType: CategoryType;
    if (data.type === TransactionType.INCOME) {
      expectedCategoryType = CategoryType.INCOME;
    } else if (data.type === TransactionType.EXPENSE) {
      expectedCategoryType = CategoryType.EXPENSE;
    } else {
      expectedCategoryType = CategoryType.TRANSFER;
    }

    if (category.type !== expectedCategoryType) {
      throw new ForbiddenError(`El tipo de categoría "${category.type}" no coincide con el tipo de transacción "${data.type}"`);
    }

    // Validate payment method ownership when provided for INCOME/EXPENSE transactions
    if (data.type !== TransactionType.TRANSFER && data.paymentMethodId) {
      await this.ensurePaymentMethodExists(data.paymentMethodId, userId);

      const paymentMethod = await this.paymentMethodRepository.findById(data.paymentMethodId);

      // INCOME transactions can only be linked to BANK_ACCOUNT or CASH, not CREDIT_CARD
      if (data.type === TransactionType.INCOME) {
        if (paymentMethod && paymentMethod.type === PaymentMethodType.CREDIT_CARD) {
          throw new ForbiddenError('Los ingresos no pueden asociarse a una tarjeta de crédito');
        }
      }

      // EXPENSE on credit card: validate that amount does not exceed available credit
      if (data.type === TransactionType.EXPENSE && paymentMethod?.type === PaymentMethodType.CREDIT_CARD) {
        const details = paymentMethod.details as CreditCardDetails;
        const availableCredit = details.credit_limit - details.current_balance;
        if (data.amount > availableCredit) {
          throw new ValidationError(
            `El gasto de $${data.amount.toLocaleString('es-CO')} excede el cupo disponible de $${availableCredit.toLocaleString('es-CO')} en la tarjeta "${paymentMethod.name}"`
          );
        }
      }
    }

    // Validate TRANSFER-specific rules
    if (data.type === TransactionType.TRANSFER) {
      const sourceId = data.sourcePaymentMethodId!;
      const destinationId = data.destinationPaymentMethodId!;

      if (sourceId === destinationId) {
        throw new ValidationError('El método de pago origen y destino deben ser diferentes');
      }

      await this.ensurePaymentMethodExists(sourceId, userId);
      await this.ensurePaymentMethodExists(destinationId, userId);

      const [source, destination] = await Promise.all([
        this.paymentMethodRepository.findById(sourceId),
        this.paymentMethodRepository.findById(destinationId),
      ]);

      if (source?.type === PaymentMethodType.CREDIT_CARD) {
        throw new ValidationError('El método de pago origen no puede ser una tarjeta de crédito');
      }
      if (destination?.type === PaymentMethodType.CREDIT_CARD) {
        throw new ValidationError('El método de pago destino no puede ser una tarjeta de crédito');
      }
    }

    const categorySnapshot: CategorySnapshot = {
      id: category.id!,
      name: category.name,
      icon: category.icon ?? undefined,
    };

    // Ensure date is a Date object (Zod transforms string to Date)
    const transactionDate = data.date instanceof Date ? data.date : new Date(data.date);

    const transaction = await this.transactionRunner.run(async () => {
      const created = await this.transactionRepository.create({
        userId,
        amount: data.amount,
        description: data.description,
        date: transactionDate,
        type: data.type,
        category: categorySnapshot,
        paymentMethodId: data.paymentMethodId,
        sourcePaymentMethodId: data.sourcePaymentMethodId,
        destinationPaymentMethodId: data.destinationPaymentMethodId,
        isRecurring: false,
        budgetAmount: data.budgetAmount ?? null,
      });

      if (data.type === TransactionType.TRANSFER) {
        await this.paymentMethodService.updatePaymentMethodBalance(data.sourcePaymentMethodId!, data.amount, true);
        await this.paymentMethodService.updatePaymentMethodBalance(data.destinationPaymentMethodId!, data.amount, false);
      } else if (data.paymentMethodId) {
        const isExpense = data.type === TransactionType.EXPENSE;
        await this.paymentMethodService.updatePaymentMethodBalance(data.paymentMethodId, data.amount, isExpense);
      }

      return created;
    });

    logger.info('Transaction persisted to DB', { ...ctx, transactionId: transaction.id, type: data.type, amount: data.amount });

    // Budget recalculation is non-critical — runs outside the atomic block
    if (data.type === TransactionType.EXPENSE && this.budgetService) {
      logger.debug('Recalculating affected budgets', { ...ctx, categoryId: data.categoryId });
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
      icon: category.icon ?? undefined,
    };

    // Validate payment method
    await this.ensurePaymentMethodExists(recurringExpense.paymentMethodId, recurringExpense.userId);

    // Validate credit limit if payment method is a credit card
    const paymentMethod = await this.paymentMethodRepository.findById(recurringExpense.paymentMethodId);
    if (paymentMethod?.type === PaymentMethodType.CREDIT_CARD) {
      const details = paymentMethod.details as CreditCardDetails;
      const availableCredit = details.credit_limit - details.current_balance;
      if (recurringExpense.amount > availableCredit) {
        throw new ValidationError(
          `El gasto recurrente de $${recurringExpense.amount.toLocaleString('es-CO')} excede el cupo disponible de $${availableCredit.toLocaleString('es-CO')} en la tarjeta "${paymentMethod.name}"`
        );
      }
    }

    const nextPaymentDate = this.calculateNextPaymentDate(
      new Date(),
      recurringExpense.payDay,
      recurringExpense.frequency
    );

    const transaction = await this.transactionRunner.run(async () => {
      const created = await this.transactionRepository.create({
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

      await this.recurringExpenseRepository.updateNextPaymentDate(recurringExpenseId, nextPaymentDate);

      if (recurringExpense.paymentMethodId) {
        await this.paymentMethodService.updatePaymentMethodBalance(
          recurringExpense.paymentMethodId,
          recurringExpense.amount,
          true,
        );
      }

      return created;
    });

    // Budget recalculation is non-critical — runs outside the atomic block
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
  async getHistory(userId: string, filters?: TransactionHistoryFilters): Promise<{ items: (Transaction & { gmfAmount: number })[]; total: number }> {
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
      limit: filters?.limit,
      offset: filters?.offset,
    };

    const result = await this.transactionRepository.findAllByUser(userId, repositoryFilters);

    // Enrich transactions with gmfAmount (4x1000 tax)
    const paymentMethods = await this.paymentMethodRepository.findAllByUser(userId);
    const pmMap = new Map(paymentMethods.map(pm => [pm.id, pm]));

    const enrichedItems = result.items.map(t => {
      let gmfAmount = 0;
      if (t.type === TransactionType.EXPENSE && t.paymentMethodId) {
        const pm = pmMap.get(t.paymentMethodId);
        if (pm && pm.type === PaymentMethodType.BANK_ACCOUNT) {
          const details = pm.details as BankAccountDetails;
          if (!details.is_gmf_exempt) {
            gmfAmount = Math.round(t.amount * 0.004);
          }
        }
      }
      return { ...t, gmfAmount };
    });

    return { items: enrichedItems, total: result.total };
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

    // TRANSFER transactions cannot change type, and non-TRANSFER transactions cannot become TRANSFER
    if (
      (transaction.type === TransactionType.TRANSFER && data.type !== undefined && data.type !== TransactionType.TRANSFER) ||
      (transaction.type !== TransactionType.TRANSFER && data.type === TransactionType.TRANSFER)
    ) {
      throw new ValidationError('No se puede cambiar el tipo de una transferencia');
    }

    // The effective transaction type after the update (may change if data.type is provided)
    const effectiveType = data.type ?? transaction.type;

    // Block unsupported update paths for TRANSFER transactions
    if (effectiveType === TransactionType.TRANSFER) {
      // For transfers, only allow updating amount, description, and date
      if (data.categoryId || data.paymentMethodId) {
        throw new ValidationError('No se puede cambiar la categoría o método de pago de una transferencia');
      }
      // Handle sourcePaymentMethodId and destinationPaymentMethodId updates for TRANSFER
      const updateData: Partial<Omit<Transaction, 'id' | 'userId' | 'createdAt' | 'updatedAt'>> = {};
      if (typeof data.amount === 'number') updateData.amount = data.amount;
      if (typeof data.description === 'string') updateData.description = data.description;
      if (data.date instanceof Date) updateData.date = data.date;
      if (data.sourcePaymentMethodId) {
        await this.ensurePaymentMethodExists(data.sourcePaymentMethodId, userId);
        const source = await this.paymentMethodRepository.findById(data.sourcePaymentMethodId);
        if (source?.type === PaymentMethodType.CREDIT_CARD) {
          throw new ValidationError('El método de pago origen no puede ser una tarjeta de crédito');
        }
        updateData.sourcePaymentMethodId = data.sourcePaymentMethodId;
      }
      if (data.destinationPaymentMethodId) {
        await this.ensurePaymentMethodExists(data.destinationPaymentMethodId, userId);
        const destination = await this.paymentMethodRepository.findById(data.destinationPaymentMethodId);
        if (destination?.type === PaymentMethodType.CREDIT_CARD) {
          throw new ValidationError('El método de pago destino no puede ser una tarjeta de crédito');
        }
        updateData.destinationPaymentMethodId = data.destinationPaymentMethodId;
      }

      const finalSourceId = updateData.sourcePaymentMethodId ?? transaction.sourcePaymentMethodId;
      const finalDestinationId = updateData.destinationPaymentMethodId ?? transaction.destinationPaymentMethodId;
      if (finalSourceId && finalDestinationId && finalSourceId === finalDestinationId) {
        throw new ValidationError('El método de pago origen y destino deben ser diferentes');
      }

      const finalAmount = typeof data.amount === 'number' ? data.amount : transaction.amount;

      return this.transactionRunner.run(async () => {
        if (transaction.sourcePaymentMethodId) {
          await this.paymentMethodService.updatePaymentMethodBalance(transaction.sourcePaymentMethodId, transaction.amount, false);
        }
        if (transaction.destinationPaymentMethodId) {
          await this.paymentMethodService.updatePaymentMethodBalance(transaction.destinationPaymentMethodId, transaction.amount, true);
        }

        const updatedTransaction = await this.transactionRepository.update(id, updateData);
        if (!updatedTransaction) throw new NotFoundError('Transaction', id);

        const newSourceId = finalSourceId ?? transaction.sourcePaymentMethodId;
        const newDestinationId = finalDestinationId ?? transaction.destinationPaymentMethodId;
        if (newSourceId) {
          await this.paymentMethodService.updatePaymentMethodBalance(newSourceId, finalAmount, true);
        }
        if (newDestinationId) {
          await this.paymentMethodService.updatePaymentMethodBalance(newDestinationId, finalAmount, false);
        }

        return updatedTransaction;
      });
    }

    const expectedCategoryType = effectiveType === TransactionType.INCOME ? CategoryType.INCOME : CategoryType.EXPENSE;

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
    if (data.type !== undefined) {
      updateData.type = data.type;
    }

    // Handle category update — also triggered when only the type changes, to re-validate the existing category
    const categoryIdToValidate = data.categoryId ?? (data.type !== undefined ? transaction.category.id : undefined);
    if (categoryIdToValidate) {
      const category = await this.categoryRepository.findById(categoryIdToValidate);
      if (!category) {
        throw new NotFoundError('Category', categoryIdToValidate);
      }
      if (category.userId !== userId) {
        throw new ForbiddenError('No tienes permiso para usar esta categoría');
      }
      if (category.type !== expectedCategoryType) {
        throw new ValidationError('La categoría no corresponde al tipo de transacción');
      }
      // Only write the snapshot when the caller explicitly changed the category
      if (data.categoryId) {
        updateData.category = {
          id: category.id!,
          name: category.name,
          icon: category.icon ?? undefined,
        };
      }
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

    if (data.budgetAmount !== undefined) {
      updateData.budgetAmount = data.budgetAmount;
    }

    const finalAmount = typeof data.amount === 'number' ? data.amount : transaction.amount;
    const finalPaymentMethodId = data.paymentMethodId !== undefined ? data.paymentMethodId : transaction.paymentMethodId;

    const updatedTransaction = await this.transactionRunner.run(async () => {
      if (transaction.paymentMethodId) {
        const isOriginalExpense = transaction.type === TransactionType.EXPENSE;
        await this.paymentMethodService.updatePaymentMethodBalance(
          transaction.paymentMethodId,
          transaction.amount,
          !isOriginalExpense,
        );
      }

      const updated = await this.transactionRepository.update(id, updateData);
      if (!updated) throw new NotFoundError('Transaction', id);

      if (finalPaymentMethodId) {
        const isExpense = effectiveType === TransactionType.EXPENSE;
        await this.paymentMethodService.updatePaymentMethodBalance(finalPaymentMethodId, finalAmount, isExpense);
      }

      return updated;
    });

    // Budget recalculation is non-critical — runs outside the atomic block
    if ((transaction.type === TransactionType.EXPENSE || effectiveType === TransactionType.EXPENSE) && this.budgetService) {
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
    const ctx = getRequestContext();
    const transaction = await this.transactionRepository.findById(id);
    if (!transaction) {
      throw new NotFoundError('Transaction', id);
    }
    if (transaction.userId !== userId) {
      logger.warn('Attempted to delete transaction owned by another user', { ...ctx, transactionId: id });
      throw new ForbiddenError('No tienes permiso para eliminar esta transacción');
    }

    await this.transactionRunner.run(async () => {
      if (transaction.type === TransactionType.TRANSFER) {
        if (transaction.sourcePaymentMethodId) {
          await this.paymentMethodService.updatePaymentMethodBalance(transaction.sourcePaymentMethodId, transaction.amount, false);
        }
        if (transaction.destinationPaymentMethodId) {
          await this.paymentMethodService.updatePaymentMethodBalance(transaction.destinationPaymentMethodId, transaction.amount, true);
        }
      } else if (transaction.subtype === TransactionSubtype.CARD_PAYMENT && transaction.cardPaymentDetails) {
        const cardId = transaction.cardPaymentDetails.creditCardId;
        await this.paymentMethodService.updatePaymentMethodBalance(cardId, transaction.amount, true);
      } else if (transaction.paymentMethodId) {
        const isOriginalExpense = transaction.type === TransactionType.EXPENSE;
        await this.paymentMethodService.updatePaymentMethodBalance(
          transaction.paymentMethodId,
          transaction.amount,
          !isOriginalExpense,
        );
      }

      await this.transactionRepository.delete(id);
    });

    logger.info('Transaction deleted from DB', { ...ctx, transactionId: id });

    // Budget recalculation is non-critical — runs outside the atomic block
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

