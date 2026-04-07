import { TransactionRepository, TransactionFilters } from '../../domain/finance/repositories/transaction.repository';
import { Transaction } from '../../domain/finance/types/transaction.types';
import { TransactionModel, ITransactionDocument } from '../database/models/transaction.model';
import { getMongooseInstance } from '../database/mongoose-client';
import { TransactionSubtype } from 'fa-contracts';
import mongoose from 'mongoose';
import { sanitizeStringValue } from '../utils/sanitize-query';

/**
 * Mongoose implementation of TransactionRepository.
 */
export class TransactionMongooseRepository implements TransactionRepository {
  /**
   * Persists a transaction document.
   *
   * @param {Transaction} transaction Transaction payload containing the owner reference.
   * @returns {Promise<Transaction>} Created transaction mapped to the domain type.
   */
  async create(transaction: Transaction): Promise<Transaction> {
    await getMongooseInstance();
    const created = await TransactionModel.create({
      amount: transaction.amount,
      description: transaction.description,
      date: transaction.date,
      type: transaction.type,
      subtype: transaction.subtype ?? null,
      user: transaction.userId,
      category: transaction.category,
      paymentMethod: transaction.paymentMethodId || null,
      isRecurring: transaction.isRecurring,
      recurringExpense: transaction.recurringExpenseId,
      cardPaymentDetails: transaction.cardPaymentDetails ?? null,
    });
    return this.toDomain(created);
  }

  /**
   * Retrieves transactions for a user with optional filters, ordered by date (descending).
   *
   * @param {string} userId Owner identifier.
   * @param {TransactionFilters} filters Optional filters for date range, type, category.
   * @returns {Promise<Transaction[]>} Transactions tied to the user, ordered by date descending.
   */
  async findAllByUser(userId: string, filters?: TransactionFilters): Promise<{ items: Transaction[]; total: number }> {
    await getMongooseInstance();
    const query: Record<string, unknown> = { user: userId };

    const dateFilter: Record<string, Date> = {};
    if (filters?.startDate) {
      dateFilter.$gte = filters.startDate;
    }
    if (filters?.endDate) {
      dateFilter.$lte = filters.endDate;
    }
    if (Object.keys(dateFilter).length > 0) {
      query.date = mongoose.trusted(dateFilter);
    }
    if (filters?.type) {
      query.type = filters.type;
    }
    if (filters?.categoryId) {
      query['category.id'] = sanitizeStringValue(filters.categoryId);
    }
    if (filters?.paymentMethodId) {
      query.paymentMethod = sanitizeStringValue(filters.paymentMethodId);
    }
    if (filters?.subtype !== undefined && filters.subtype !== null) {
      query.subtype = sanitizeStringValue(filters.subtype);
    } else if (filters?.subtype === null) {
      query.subtype = null;
    }
    if (filters?.excludeCardPayments) {
      query.subtype = mongoose.trusted({ $ne: TransactionSubtype.CARD_PAYMENT });
    }

    const limit = filters?.limit ?? 50;
    const offset = filters?.offset ?? 0;

    const [transactions, total] = await Promise.all([
      TransactionModel.find(query).sort({ date: -1, createdAt: -1 }).skip(offset).limit(limit).exec(),
      TransactionModel.countDocuments(query).exec(),
    ]);

    return {
      items: transactions.map((transaction) => this.toDomain(transaction)),
      total,
    };
  }

  /**
   * Retrieves a single transaction by identifier.
   *
   * @param {string} id Transaction identifier.
   * @returns {Promise<Transaction | null>} Matching transaction or null.
   */
  async findById(id: string): Promise<Transaction | null> {
    await getMongooseInstance();
    const transaction = await TransactionModel.findById(id).exec();
    if (!transaction) {
      return null;
    }
    return this.toDomain(transaction);
  }

  /**
   * Updates a transaction using the provided payload.
   *
   * @param {string} id Transaction identifier.
   * @param {Partial<Omit<Transaction, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>} data Fields to update.
   * @returns {Promise<Transaction | null>} Updated transaction or null when missing.
   */
  async update(
    id: string,
    data: Partial<Omit<Transaction, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<Transaction | null> {
    await getMongooseInstance();
    const mappedData: Record<string, unknown> = {};

    if (typeof data.amount === 'number') {
      mappedData.amount = data.amount;
    }
    if (typeof data.description === 'string') {
      mappedData.description = data.description;
    }
    if (data.date instanceof Date) {
      mappedData.date = data.date;
    }
    if (data.type) {
      mappedData.type = data.type;
    }
    if (data.category) {
      mappedData.category = data.category;
    }
    if (data.paymentMethodId !== undefined) {
      mappedData.paymentMethod = data.paymentMethodId || null;
    }
    if (typeof data.isRecurring === 'boolean') {
      mappedData.isRecurring = data.isRecurring;
    }
    if (data.recurringExpenseId !== undefined) {
      mappedData.recurringExpense = data.recurringExpenseId || null;
    }

    const transaction = await TransactionModel.findByIdAndUpdate(id, { $set: mappedData }, { new: true }).exec();
    if (!transaction) {
      return null;
    }
    return this.toDomain(transaction);
  }

  /**
   * Deletes a transaction by identifier.
   *
   * @param {string} id Transaction identifier.
   * @returns {Promise<void>} Resolves when the document is deleted.
   */
  async delete(id: string): Promise<void> {
    await getMongooseInstance();
    await TransactionModel.deleteOne({ _id: id }).exec();
  }

  /**
   * Maps a mongoose document to the domain type.
   *
   * @param {ITransactionDocument} doc Mongoose document.
   * @returns {Transaction} Domain transaction.
   */
  private toDomain(doc: ITransactionDocument): Transaction {
    return {
      id: doc.id,
      userId: doc.user.toString(),
      amount: doc.amount,
      description: doc.description,
      date: doc.date,
      type: doc.type,
      subtype: doc.subtype ?? null,
      category: doc.category,
      paymentMethodId: doc.paymentMethod?.toString() || undefined,
      isRecurring: doc.isRecurring,
      recurringExpenseId: doc.recurringExpense?.toString(),
      cardPaymentDetails: doc.cardPaymentDetails
        ? {
            creditCardId: doc.cardPaymentDetails.creditCardId,
            isFullPayment: doc.cardPaymentDetails.isFullPayment,
            billingPeriodStart: doc.cardPaymentDetails.billingPeriodStart,
            billingPeriodEnd: doc.cardPaymentDetails.billingPeriodEnd,
          }
        : null,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}

