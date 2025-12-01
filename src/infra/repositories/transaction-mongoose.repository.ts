import { TransactionRepository, TransactionFilters } from '../../domain/finance/repositories/transaction.repository';
import { Transaction } from '../../domain/finance/types/transaction.types';
import { TransactionModel, ITransactionDocument } from '../database/models/transaction.model';
import { getMongooseInstance } from '../database/mongoose-client';

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
      user: transaction.userId,
      category: transaction.category,
      paymentMethod: transaction.paymentMethodId, // Mongoose will convert string to ObjectId
      isRecurring: transaction.isRecurring,
      recurringExpense: transaction.recurringExpenseId,
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
  async findAllByUser(userId: string, filters?: TransactionFilters): Promise<Transaction[]> {
    await getMongooseInstance();
    const query: Record<string, unknown> = { user: userId };

    if (filters?.startDate) {
      query.date = { ...(query.date as Record<string, unknown> || {}), $gte: filters.startDate };
    }
    if (filters?.endDate) {
      query.date = { ...(query.date as Record<string, unknown> || {}), $lte: filters.endDate };
    }
    if (filters?.type) {
      query.type = filters.type;
    }
    if (filters?.categoryId) {
      query['category.id'] = filters.categoryId;
    }

    const transactions = await TransactionModel.find(query).sort({ date: -1 }).exec();
    return transactions.map((transaction) => this.toDomain(transaction));
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
      category: doc.category,
      paymentMethodId: doc.paymentMethod.toString(),
      isRecurring: doc.isRecurring,
      recurringExpenseId: doc.recurringExpense?.toString(),
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}

