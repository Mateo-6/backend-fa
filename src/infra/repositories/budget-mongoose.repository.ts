import { BudgetRepository, BudgetFilters, BudgetHistoryFilters } from '../../domain/budget/repositories/budget.repository';
import { Budget } from '../../domain/budget/types/budget.types';
import { BudgetModel, IBudgetDocument } from '../database/models/budget.model';
import { getMongooseInstance } from '../database/mongoose-client';
import mongoose from 'mongoose';
import { logger } from '../utils/logger';
import { getRequestContext } from '../http/middleware/request-context';

/**
 * Mongoose implementation of BudgetRepository.
 */
export class BudgetMongooseRepository implements BudgetRepository {
  /**
   * Persists a new budget document.
   *
   * @param {Budget} budget Budget data to persist.
   * @returns {Promise<Budget>} Created budget mapped to the domain type.
   */
  async create(budget: Budget): Promise<Budget> {
    const ctx = getRequestContext();
    logger.debug('DB insert: Budget', { ...ctx, name: budget.name, period: budget.period, amount: budget.amount });
    await getMongooseInstance();
    const created = await BudgetModel.create({
      user: budget.userId,
      name: budget.name,
      amount: budget.amount,
      currency: budget.currency,
      period: budget.period,
      categoryId: budget.categoryId || null,
      startDate: budget.startDate,
      endDate: budget.endDate,
      spent: budget.spent ?? 0,
      isActive: budget.isActive ?? true,
      rollover: budget.rollover ?? false,
      alertThresholds: budget.alertThresholds ?? [80, 100],
      alertsSent: budget.alertsSent ?? [],
    });
    return this.toDomain(created);
  }

  /**
   * Finds a budget by identifier.
   *
   * @param {string} id Budget identifier.
   * @returns {Promise<Budget | null>} Matching budget or null.
   */
  async findById(id: string): Promise<Budget | null> {
    await getMongooseInstance();
    const doc = await BudgetModel.findById(id).exec();
    if (!doc) return null;
    return this.toDomain(doc);
  }

  /**
   * Retrieves budgets for a user with optional filters.
   *
   * @param {string} userId Owner identifier.
   * @param {BudgetFilters} filters Optional filters.
   * @returns {Promise<Budget[]>} Collection of budgets ordered by createdAt descending.
   */
  async findAllByUser(userId: string, filters?: BudgetFilters): Promise<Budget[]> {
    await getMongooseInstance();
    const query: Record<string, unknown> = { user: userId };

    if (filters?.isActive !== undefined) {
      query.isActive = filters.isActive;
    }
    if (filters?.period) {
      query.period = filters.period;
    }
    if (filters?.categoryId !== undefined) {
      query.categoryId = filters.categoryId;
    }

    const docs = await BudgetModel.find(query).sort({ createdAt: -1 }).exec();
    return docs.map((doc) => this.toDomain(doc));
  }

  /**
   * Retrieves active budgets for a user sorted by consumption percentage descending.
   * Used for the summary widget (most consumed first).
   *
   * @param {string} userId Owner identifier.
   * @returns {Promise<Budget[]>} Active budgets.
   */
  async findSummary(userId: string): Promise<Budget[]> {
    await getMongooseInstance();
    const docs = await BudgetModel.find({ user: userId, isActive: true })
      .sort({ createdAt: -1 })
      .exec();

    // Sort in-memory by percentage (spent/amount) descending
    return docs
      .map((doc) => this.toDomain(doc))
      .sort((a, b) => b.spent / b.amount - a.spent / a.amount);
  }

  /**
   * Retrieves expired or inactive budgets for a user, ordered by endDate descending.
   * Used for the history view.
   *
   * @param {string} userId Owner identifier.
   * @param {BudgetHistoryFilters} filters Optional filters.
   * @returns {Promise<Budget[]>} Past budgets.
   */
  async findHistory(userId: string, filters?: BudgetHistoryFilters): Promise<Budget[]> {
    await getMongooseInstance();
    const now = new Date();
    const query: Record<string, unknown> = {
      user: userId,
      $or: mongoose.trusted([{ isActive: false }, { endDate: mongoose.trusted({ $lt: now }) }]),
    };

    const endDateFilter: Record<string, Date> = {};
    if (filters?.startDate) {
      endDateFilter.$gte = filters.startDate;
    }
    if (filters?.endDate) {
      endDateFilter.$lte = filters.endDate;
    }
    if (Object.keys(endDateFilter).length > 0) {
      query.endDate = mongoose.trusted(endDateFilter);
    }
    if (filters?.categoryId !== undefined) {
      query.categoryId = filters.categoryId;
    }

    const docs = await BudgetModel.find(query).sort({ endDate: -1 }).exec();
    return docs.map((doc) => this.toDomain(doc));
  }

  /**
   * Updates an existing budget with the provided partial payload.
   *
   * @param {string} id Budget identifier.
   * @param {Partial<Budget>} data Fields to update.
   * @returns {Promise<Budget | null>} Updated budget or null when missing.
   */
  async update(id: string, data: Partial<Budget>): Promise<Budget | null> {
    await getMongooseInstance();
    const mappedData: Record<string, unknown> = {};

    if (typeof data.name === 'string') mappedData.name = data.name;
    if (typeof data.amount === 'number') mappedData.amount = data.amount;
    if (typeof data.currency === 'string') mappedData.currency = data.currency;
    if (typeof data.period === 'string') mappedData.period = data.period;
    if (data.categoryId !== undefined) mappedData.categoryId = data.categoryId;
    if (data.startDate instanceof Date) mappedData.startDate = data.startDate;
    if (data.endDate instanceof Date) mappedData.endDate = data.endDate;
    if (typeof data.spent === 'number') mappedData.spent = data.spent;
    if (typeof data.isActive === 'boolean') mappedData.isActive = data.isActive;
    if (typeof data.rollover === 'boolean') mappedData.rollover = data.rollover;
    if (Array.isArray(data.alertThresholds)) mappedData.alertThresholds = data.alertThresholds;
    if (Array.isArray(data.alertsSent)) mappedData.alertsSent = data.alertsSent;

    const doc = await BudgetModel.findByIdAndUpdate(
      id,
      { $set: mappedData },
      { new: true }
    ).exec();

    if (!doc) return null;
    return this.toDomain(doc);
  }

  /**
   * Finds active budgets that match a given transaction by user, date range, and category.
   * Returns both category-specific budgets and global budgets (categoryId === null).
   *
   * @param {string} userId User identifier.
   * @param {string} categoryId Category identifier of the transaction.
   * @param {Date} date Date of the transaction.
   * @returns {Promise<Budget[]>} Matching active budgets.
   */
  async findMatchingBudgets(userId: string, categoryId: string, date: Date): Promise<Budget[]> {
    await getMongooseInstance();
    const docs = await BudgetModel.find({
      user: userId,
      isActive: true,
      startDate: mongoose.trusted({ $lte: date }),
      endDate: mongoose.trusted({ $gte: date }),
      $or: mongoose.trusted([{ categoryId: categoryId }, { categoryId: null }]),
    }).exec();
    return docs.map((doc) => this.toDomain(doc));
  }

  /**
   * Maps a Mongoose document to the Budget domain type.
   *
   * @param {IBudgetDocument} doc Mongoose document.
   * @returns {Budget} Domain budget.
   */
  private toDomain(doc: IBudgetDocument): Budget {
    const obj = doc.toObject();
    return {
      id: obj.id,
      userId: obj.userId,
      name: obj.name,
      amount: obj.amount,
      currency: obj.currency,
      period: obj.period,
      categoryId: obj.categoryId,
      startDate: obj.startDate,
      endDate: obj.endDate,
      spent: obj.spent,
      isActive: obj.isActive,
      rollover: obj.rollover,
      alertThresholds: obj.alertThresholds,
      alertsSent: obj.alertsSent,
      createdAt: obj.createdAt,
      updatedAt: obj.updatedAt,
    };
  }

  async deleteById(id: string): Promise<void> {
    await getMongooseInstance();
    await BudgetModel.findByIdAndDelete(id).exec();
  }
}
