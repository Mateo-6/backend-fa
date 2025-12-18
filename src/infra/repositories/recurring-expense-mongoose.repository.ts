import { RecurringExpenseRepository } from '../../domain/finance/repositories/recurring-expense.repository';
import { RecurringExpense } from '../../domain/finance/types/recurring-expense.types';
import { RecurringExpenseModel, IRecurringExpenseDocument } from '../database/models/recurring-expense.model';
import { getMongooseInstance } from '../database/mongoose-client';

/**
 * Mongoose implementation of RecurringExpenseRepository.
 */
export class RecurringExpenseMongooseRepository implements RecurringExpenseRepository {
  /**
   * Persists a recurring expense document.
   *
   * @param {RecurringExpense} recurringExpense Recurring expense payload containing the owner reference.
   * @returns {Promise<RecurringExpense>} Created recurring expense mapped to the domain type.
   */
  async create(recurringExpense: RecurringExpense): Promise<RecurringExpense> {
    await getMongooseInstance();
    const created = await RecurringExpenseModel.create({
      name: recurringExpense.name,
      amount: recurringExpense.amount,
      currency: recurringExpense.currency,
      user: recurringExpense.userId,
      category: recurringExpense.categoryId,
      paymentMethod: recurringExpense.paymentMethodId, // Mongoose will convert string to ObjectId
      frequency: recurringExpense.frequency,
      payDay: recurringExpense.payDay,
      startDate: recurringExpense.startDate,
      nextPaymentDate: recurringExpense.nextPaymentDate,
      isActive: recurringExpense.isActive,
    });
    return this.toDomain(created);
  }

  /**
   * Retrieves the recurring expenses that belong to the provided user.
   *
   * @param {string} userId Owner identifier.
   * @returns {Promise<RecurringExpense[]>} Recurring expenses tied to the user.
   */
  async findAllByUser(userId: string): Promise<RecurringExpense[]> {
    await getMongooseInstance();
    const recurringExpenses = await RecurringExpenseModel.find({ user: userId })
      .sort({ createdAt: -1 })
      .exec();
    return recurringExpenses.map((recurringExpense) => this.toDomain(recurringExpense));
  }

  /**
   * Retrieves a single recurring expense by identifier.
   *
   * @param {string} id Recurring expense identifier.
   * @returns {Promise<RecurringExpense | null>} Matching recurring expense or null.
   */
  async findById(id: string): Promise<RecurringExpense | null> {
    await getMongooseInstance();
    const recurringExpense = await RecurringExpenseModel.findById(id).exec();
    if (!recurringExpense) {
      return null;
    }
    return this.toDomain(recurringExpense);
  }

  /**
   * Updates a recurring expense using the provided payload.
   *
   * @param {string} id Recurring expense identifier.
   * @param {Partial<Omit<RecurringExpense, 'id'>>} data Fields to update.
   * @returns {Promise<RecurringExpense | null>} Updated recurring expense or null when missing.
   */
  async update(id: string, data: Partial<Omit<RecurringExpense, 'id'>>): Promise<RecurringExpense | null> {
    await getMongooseInstance();
    const mappedData: Record<string, unknown> = {};

    if (typeof data.name === 'string') {
      mappedData.name = data.name;
    }
    if (typeof data.amount === 'number') {
      mappedData.amount = data.amount;
    }
    if (typeof data.currency === 'string') {
      mappedData.currency = data.currency;
    }
    if (typeof data.categoryId === 'string') {
      mappedData.category = data.categoryId;
    }
    if (typeof data.paymentMethodId === 'string') {
      mappedData.paymentMethod = data.paymentMethodId; // Mongoose will convert string to ObjectId
    }
    if (data.frequency) {
      mappedData.frequency = data.frequency;
    }
    if (typeof data.payDay === 'number') {
      mappedData.payDay = data.payDay;
    }
    if (data.startDate instanceof Date) {
      mappedData.startDate = data.startDate;
    }
    if (data.nextPaymentDate instanceof Date) {
      mappedData.nextPaymentDate = data.nextPaymentDate;
    }
    if (typeof data.isActive === 'boolean') {
      mappedData.isActive = data.isActive;
    }

    const recurringExpense = await RecurringExpenseModel.findByIdAndUpdate(id, { $set: mappedData }, { new: true }).exec();
    if (!recurringExpense) {
      return null;
    }
    return this.toDomain(recurringExpense);
  }

  /**
   * Deletes a recurring expense by identifier.
   *
   * @param {string} id Recurring expense identifier.
   * @returns {Promise<void>} Resolves when the document is deleted.
   */
  async delete(id: string): Promise<void> {
    await getMongooseInstance();
    await RecurringExpenseModel.deleteOne({ _id: id }).exec();
  }

  /**
   * Updates the next payment date for a recurring expense.
   *
   * @param {string} id Recurring expense identifier.
   * @param {Date} nextPaymentDate New next payment date.
   * @returns {Promise<RecurringExpense | null>} Updated recurring expense or null when missing.
   */
  async updateNextPaymentDate(id: string, nextPaymentDate: Date): Promise<RecurringExpense | null> {
    await getMongooseInstance();
    const recurringExpense = await RecurringExpenseModel.findByIdAndUpdate(
      id,
      { $set: { nextPaymentDate } },
      { new: true }
    ).exec();
    if (!recurringExpense) {
      return null;
    }
    return this.toDomain(recurringExpense);
  }

  /**
   * Finds all active recurring expenses that are due for payment.
   * Returns recurring expenses where nextPaymentDate is less than or equal to the provided date.
   *
   * @param {Date} date Date to check against (typically today's date).
   * @returns {Promise<RecurringExpense[]>} Collection of recurring expenses due for payment.
   */
  async findDueForPayment(date: Date): Promise<RecurringExpense[]> {
    await getMongooseInstance();
    // Set time to end of day to include all expenses due today
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const recurringExpenses = await RecurringExpenseModel.find({
      isActive: true,
      nextPaymentDate: { $lte: endOfDay },
    }).exec();

    return recurringExpenses.map((recurringExpense) => this.toDomain(recurringExpense));
  }

  /**
   * Maps a mongoose document to the domain type.
   *
   * @param {IRecurringExpenseDocument} doc Mongoose document.
   * @returns {RecurringExpense} Domain recurring expense.
   */
  private toDomain(doc: IRecurringExpenseDocument): RecurringExpense {
    return {
      id: doc.id,
      userId: doc.user.toString(),
      name: doc.name,
      amount: doc.amount,
      currency: doc.currency,
      categoryId: doc.category.toString(),
      paymentMethodId: doc.paymentMethod.toString(),
      frequency: doc.frequency,
      payDay: doc.payDay,
      startDate: doc.startDate,
      nextPaymentDate: doc.nextPaymentDate,
      isActive: doc.isActive,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}

