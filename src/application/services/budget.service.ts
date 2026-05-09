import { BudgetRepository } from '../../domain/budget/repositories/budget.repository';
import { Budget, BudgetPeriod } from '../../domain/budget/types/budget.types';
import { TransactionRepository } from '../../domain/finance/repositories/transaction.repository';
import { NotificationRepository } from '../../domain/notification/repositories/notification.repository';
import { NotificationPriority } from '../../domain/notification/types/notification.types';
import { UserRepository } from '../../domain/user/repositories/user.repository';
import { CreateBudgetDto } from '../dto/budget/create-budget.dto';
import { UpdateBudgetDto } from '../dto/budget/update-budget.dto';
import { NotFoundError, ForbiddenError, ConflictError } from '../../domain/errors/app-error';
import { TransactionType } from '../../domain/finance/types/transaction.types';

/**
 * Budget with computed progress fields appended.
 */
export interface BudgetWithProgress extends Budget {
  remaining: number;
  percentage: number;
  resultado?: 'CUMPLIDO' | 'EXCEDIDO' | 'EN_LIMITE';
}

/**
 * Service for managing budgets and tracking spending progress.
 */
export class BudgetService {
  /**
   * @param {BudgetRepository} budgetRepository Repository for budget persistence.
   * @param {TransactionRepository} transactionRepository Repository for summing transactions.
   * @param {NotificationRepository} notificationRepository Repository for alert notifications.
   * @param {UserRepository} userRepository Repository for retrieving push tokens.
   */
  constructor(
    private readonly budgetRepository: BudgetRepository,
    private readonly transactionRepository: TransactionRepository,
    private readonly notificationRepository: NotificationRepository,
    private readonly userRepository: UserRepository
  ) {}

  /**
   * Creates a new budget for the user.
   * Validates no overlapping active budget for the same category exists.
   * Computes endDate from startDate + period.
   *
   * @param {CreateBudgetDto} data Validated budget payload.
   * @param {string} userId User identifier from JWT.
   * @returns {Promise<BudgetWithProgress>} Newly created budget with progress fields.
   * @throws {ConflictError} If an active overlapping budget for the same category already exists.
   */
  async create(data: CreateBudgetDto, userId: string): Promise<BudgetWithProgress> {
    const startDate = data.startDate ?? this.getPeriodStart(data.period);
    const endDate = this.calculateEndDate(startDate, data.period);

    // Validate no active overlapping budget for same categoryId
    const existing = await this.budgetRepository.findAllByUser(userId, { isActive: true });
    const conflict = existing.find((b) => {
      const sameCat = b.categoryId === (data.categoryId ?? null);
      const overlaps = b.startDate <= endDate && b.endDate >= startDate;
      return sameCat && overlaps;
    });
    if (conflict) {
      throw new ConflictError(
        `Ya existe un presupuesto activo para esta categoría en el período indicado: "${conflict.name}"`
      );
    }

    const created = await this.budgetRepository.create({
      userId,
      name: data.name,
      amount: data.amount,
      currency: data.currency,
      period: data.period,
      categoryId: data.categoryId ?? null,
      startDate,
      endDate,
      spent: 0,
      isActive: true,
      rollover: data.rollover ?? false,
      alertThresholds: data.alertThresholds ?? [80, 100],
      alertsSent: [],
    });

    // Backfill spent from transactions that already exist in this period
    await this.recalculateSpent(created.id!);
    const updated = await this.budgetRepository.findById(created.id!);
    return this.withProgress(updated ?? created);
  }

  /**
   * Retrieves all budgets for a user with optional filters.
   * Active budgets only by default.
   *
   * @param {string} userId User identifier.
   * @param {{ isActive?: boolean; includeExpired?: boolean }} filters Optional filters.
   * @returns {Promise<BudgetWithProgress[]>} Budgets with computed progress fields.
   */
  async getAll(
    userId: string,
    filters?: { isActive?: boolean; includeExpired?: boolean }
  ): Promise<BudgetWithProgress[]> {
    const repoFilters = filters?.includeExpired
      ? undefined
      : { isActive: filters?.isActive ?? true };
    const budgets = await this.budgetRepository.findAllByUser(userId, repoFilters);
    return budgets.map((b) => this.withProgress(b));
  }

  /**
   * Retrieves active budgets sorted by consumption percentage descending.
   * Used for the dashboard widget.
   *
   * @param {string} userId User identifier.
   * @returns {Promise<BudgetWithProgress[]>} Summary budgets.
   */
  async getSummary(userId: string): Promise<BudgetWithProgress[]> {
    const budgets = await this.budgetRepository.findSummary(userId);
    return budgets.map((b) => this.withProgress(b));
  }

  /**
   * Retrieves expired or inactive budgets for a user (history view).
   *
   * @param {string} userId User identifier.
   * @returns {Promise<BudgetWithProgress[]>} Past budgets with result badge.
   */
  async getHistory(userId: string): Promise<BudgetWithProgress[]> {
    const budgets = await this.budgetRepository.findHistory(userId);
    return budgets.map((b) => this.withProgress(b));
  }

  /**
   * Retrieves a single budget by ID.
   *
   * @param {string} id Budget identifier.
   * @param {string} userId User identifier for ownership validation.
   * @returns {Promise<BudgetWithProgress>} Budget with progress fields.
   * @throws {NotFoundError} If the budget does not exist.
   * @throws {ForbiddenError} If the budget does not belong to the user.
   */
  async getById(id: string, userId: string): Promise<BudgetWithProgress> {
    const budget = await this.budgetRepository.findById(id);
    if (!budget) throw new NotFoundError('Budget', id);
    if (budget.userId !== userId) throw new ForbiddenError('No tienes permiso para ver este presupuesto');
    return this.withProgress(budget);
  }

  /**
   * Updates mutable fields of an existing budget.
   * period and categoryId are immutable after creation.
   *
   * @param {string} id Budget identifier.
   * @param {UpdateBudgetDto} data Fields to update.
   * @param {string} userId User identifier for ownership validation.
   * @returns {Promise<BudgetWithProgress>} Updated budget with progress fields.
   * @throws {NotFoundError} If the budget does not exist.
   * @throws {ForbiddenError} If the budget does not belong to the user.
   */
  async update(id: string, data: UpdateBudgetDto, userId: string): Promise<BudgetWithProgress> {
    const budget = await this.budgetRepository.findById(id);
    if (!budget) throw new NotFoundError('Budget', id);
    if (budget.userId !== userId) throw new ForbiddenError('No tienes permiso para modificar este presupuesto');

    const updated = await this.budgetRepository.update(id, data);
    if (!updated) throw new NotFoundError('Budget', id);
    return this.withProgress(updated);
  }

  /**
   * Finalizes a budget by setting isActive to false (soft close).
   * The budget remains in history with a resultado badge.
   *
   * @param {string} id Budget identifier.
   * @param {string} userId User identifier for ownership validation.
   * @returns {Promise<void>} Resolves when finalized.
   * @throws {NotFoundError} If the budget does not exist.
   * @throws {ForbiddenError} If the budget does not belong to the user.
   */
  async finalize(id: string, userId: string): Promise<void> {
    const budget = await this.budgetRepository.findById(id);
    if (!budget) throw new NotFoundError('Budget', id);
    if (budget.userId !== userId) throw new ForbiddenError('No tienes permiso para finalizar este presupuesto');
    await this.budgetRepository.update(id, { isActive: false });
  }

  /**
   * Forces a recalculation of the spent amount for a budget by aggregating all matching
   * EXPENSE transactions that fall within its date range and category.
   * Useful when expenses were created before the budget existed.
   *
   * @param {string} id Budget identifier.
   * @param {string} userId User identifier for ownership validation.
   * @returns {Promise<BudgetWithProgress>} Updated budget with recalculated progress fields.
   * @throws {NotFoundError} If the budget does not exist.
   * @throws {ForbiddenError} If the budget does not belong to the user.
   */
  async recalculate(id: string, userId: string): Promise<BudgetWithProgress> {
    const budget = await this.budgetRepository.findById(id);
    if (!budget) throw new NotFoundError('Budget', id);
    if (budget.userId !== userId) throw new ForbiddenError('No tienes permiso para recalcular este presupuesto');
    await this.recalculateSpent(id);
    const updated = await this.budgetRepository.findById(id);
    return this.withProgress(updated ?? budget);
  }

  /**
   * Permanently removes a budget from the database.
   *
   * @param {string} id Budget identifier.
   * @param {string} userId User identifier for ownership validation.
   * @returns {Promise<void>} Resolves when deleted.
   * @throws {NotFoundError} If the budget does not exist.
   * @throws {ForbiddenError} If the budget does not belong to the user.
   */
  async permanentDelete(id: string, userId: string): Promise<void> {
    const budget = await this.budgetRepository.findById(id);
    if (!budget) throw new NotFoundError('Budget', id);
    if (budget.userId !== userId) throw new ForbiddenError('No tienes permiso para eliminar este presupuesto');
    await this.budgetRepository.deleteById(id);
  }

  /**
   * Recalculates the spent amount for a single budget by summing all matching EXPENSE transactions.
   * After recalculation, checks alert thresholds and sends push notifications if needed.
   *
   * @param {string} budgetId Budget identifier.
   * @returns {Promise<void>} Resolves when recalculation and alerts are done.
   */
  async recalculateSpent(budgetId: string): Promise<void> {
    const budget = await this.budgetRepository.findById(budgetId);
    if (!budget || !budget.isActive) return;

    const filters: Record<string, unknown> = {
      startDate: budget.startDate,
      endDate: budget.endDate,
      type: TransactionType.EXPENSE,
      excludeCardPayments: true,
    };

    // If budget is category-specific, filter by that category
    if (budget.categoryId) {
      (filters as any).categoryId = budget.categoryId;
    }

    const { items: transactions } = await this.transactionRepository.findAllByUser(budget.userId, filters as any);

    const newSpent = transactions.reduce((sum, t) => sum + (t.budgetAmount ?? t.amount), 0);

    await this.budgetRepository.update(budgetId, { spent: newSpent });

    await this.checkAndSendAlerts({ ...budget, spent: newSpent });
  }

  /**
   * Finds all active budgets matching a transaction (by user, category, and date) and recalculates spent.
   * Called by TransactionService after create/update/delete of an EXPENSE.
   *
   * @param {string} userId User identifier.
   * @param {string} categoryId Category identifier of the transaction.
   * @param {Date} transactionDate Date of the transaction.
   * @returns {Promise<void>} Resolves when all affected budgets are updated.
   */
  async updateBudgetsForTransaction(userId: string, categoryId: string, transactionDate: Date): Promise<void> {
    const matchingBudgets = await this.budgetRepository.findMatchingBudgets(
      userId,
      categoryId,
      transactionDate
    );
    await Promise.all(matchingBudgets.map((b) => this.recalculateSpent(b.id!)));
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Checks alert thresholds for a budget after a spent update.
   * If a new threshold is crossed, persists a notification and sends an Expo push.
   *
   * @param {Budget} budget Budget with updated spent value.
   * @returns {Promise<void>}
   */
  private async checkAndSendAlerts(budget: Budget): Promise<void> {
    if (!budget.amount || budget.amount <= 0) return;

    const percentage = (budget.spent / budget.amount) * 100;
    const newlyTriggered: number[] = [];

    for (const threshold of budget.alertThresholds) {
      if (percentage >= threshold && !budget.alertsSent.includes(threshold)) {
        newlyTriggered.push(threshold);
      }
    }

    if (newlyTriggered.length === 0) return;

    const remaining = Math.max(0, budget.amount - budget.spent);
    const overAmount = Math.max(0, budget.spent - budget.amount);

    for (const threshold of newlyTriggered) {
      let title: string;
      let body: string;
      let priority: NotificationPriority;

      if (threshold >= 100 && budget.spent > budget.amount) {
        title = '🚨 Presupuesto excedido';
        body = `Has excedido el presupuesto "${budget.name}" en ${budget.currency} ${this.formatAmount(overAmount)}.`;
        priority = NotificationPriority.URGENT;
      } else if (threshold >= 100) {
        title = '🚨 Límite alcanzado';
        body = `Has alcanzado el límite de "${budget.name}". Gastado: ${budget.currency} ${this.formatAmount(budget.spent)} de ${budget.currency} ${this.formatAmount(budget.amount)}.`;
        priority = NotificationPriority.HIGH;
      } else {
        title = `⚠ Presupuesto al ${threshold}%`;
        body = `Has usado el ${threshold}% de "${budget.name}". Te quedan ${budget.currency} ${this.formatAmount(remaining)}.`;
        priority = NotificationPriority.MEDIUM;
      }

      // Persist notification to DB
      try {
        await this.notificationRepository.create({
          userId: budget.userId,
          title,
          body,
          priority,
          isRead: false,
          metadata: {
            type: 'BUDGET_ALERT',
            budgetId: budget.id,
            threshold,
            percentage: Math.round(percentage),
          },
        });
      } catch (error) {
        console.error(`[BudgetService] Error persisting alert for budget ${budget.id}:`, error);
      }

      // Send Expo push notification
      this.sendExpoPush(budget.userId, title, body, budget.id!).catch((err) =>
        console.error(`[BudgetService] Error sending push for budget ${budget.id}:`, err)
      );
    }

    // Mark thresholds as sent
    const updatedAlertsSent = [...new Set([...budget.alertsSent, ...newlyTriggered])];
    await this.budgetRepository.update(budget.id!, { alertsSent: updatedAlertsSent });
  }

  /**
   * Sends an Expo push notification to all devices of a user.
   * Uses the Expo Push API directly via fetch (no SDK dependency).
   *
   * @param {string} userId User identifier.
   * @param {string} title Notification title.
   * @param {string} body Notification body.
   * @param {string} budgetId Budget identifier for deep linking.
   * @returns {Promise<void>}
   */
  private async sendExpoPush(userId: string, title: string, body: string, budgetId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user?.expoPushTokens?.length) return;

    const validTokens = user.expoPushTokens.filter((t) => t.startsWith('ExponentPushToken['));
    if (validTokens.length === 0) return;

    const messages = validTokens.map((to) => ({
      to,
      title,
      body,
      data: { type: 'BUDGET_ALERT', budgetId },
      sound: 'default',
    }));

    const chunkSize = 100;
    for (let i = 0; i < messages.length; i += chunkSize) {
      const chunk = messages.slice(i, i + chunkSize);
      try {
        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(chunk),
        });
      } catch (err) {
        console.error('[BudgetService] Expo push error:', err);
      }
    }
  }

  /**
   * Appends computed progress fields to a budget.
   *
   * @param {Budget} budget Budget domain object.
   * @returns {BudgetWithProgress} Budget enriched with remaining, percentage, and resultado.
   */
  private withProgress(budget: Budget): BudgetWithProgress {
    const percentage = budget.amount > 0 ? (budget.spent / budget.amount) * 100 : 0;
    const remaining = Math.max(0, budget.amount - budget.spent);

    let resultado: BudgetWithProgress['resultado'];
    if (!budget.isActive || budget.endDate < new Date()) {
      if (budget.spent > budget.amount) {
        resultado = 'EXCEDIDO';
      } else if (percentage >= 80) {
        resultado = 'EN_LIMITE';
      } else {
        resultado = 'CUMPLIDO';
      }
    }

    return { ...budget, remaining, percentage, resultado };
  }

  /**
   * Calculates the endDate from a startDate and period.
   *
   * @param {Date} startDate Start date of the budget.
   * @param {BudgetPeriod} period Frequency period.
   * @returns {Date} Computed end date (end of the period).
   */
  private calculateEndDate(startDate: Date, period: BudgetPeriod): Date {
    const end = new Date(startDate);
    switch (period) {
      case BudgetPeriod.WEEKLY:
        end.setDate(end.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        break;
      case BudgetPeriod.MONTHLY:
        end.setMonth(end.getMonth() + 1);
        end.setDate(end.getDate() - 1);
        end.setHours(23, 59, 59, 999);
        break;
      case BudgetPeriod.YEARLY:
        end.setFullYear(end.getFullYear() + 1);
        end.setDate(end.getDate() - 1);
        end.setHours(23, 59, 59, 999);
        break;
    }
    return end;
  }

  /**
   * Returns the start of the current period for the given frequency.
   *
   * @param {BudgetPeriod} period Frequency period.
   * @returns {Date} Start of the current period (at 00:00:00 UTC).
   */
  private getPeriodStart(period: BudgetPeriod): Date {
    const now = new Date();
    switch (period) {
      case BudgetPeriod.WEEKLY: {
        const day = now.getUTCDay();
        const monday = new Date(now);
        monday.setUTCDate(now.getUTCDate() - day + (day === 0 ? -6 : 1));
        monday.setUTCHours(0, 0, 0, 0);
        return monday;
      }
      case BudgetPeriod.MONTHLY:
        return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      case BudgetPeriod.YEARLY:
        return new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    }
  }

  /**
   * Formats an amount to a locale string without decimals.
   *
   * @param {number} amount Amount to format.
   * @returns {string} Formatted amount string.
   */
  private formatAmount(amount: number): string {
    return Math.round(amount).toLocaleString('es-CO');
  }
}
