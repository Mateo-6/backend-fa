import { PaymentMethodRepository } from '../../domain/payment-method/repositories/payment-method.repository';
import { TransactionRepository } from '../../domain/finance/repositories/transaction.repository';
import { PaymentMethod, PaymentMethodType, CreditCardDetails, BankAccountDetails } from '../../domain/payment-method/types/payment-method.types';
import { Transaction, TransactionType } from '../../domain/finance/types/transaction.types';
import { TransactionSubtype, CardPaymentDetails } from 'fa-contracts';
import { NotFoundError, ForbiddenError, ValidationError } from '../../domain/errors/app-error';
import { TransactionModel } from '../../infra/database/models/transaction.model';
import { PaymentMethodModel } from '../../infra/database/models/payment-method.model';

/** Constant category snapshot used for all CARD_PAYMENT transactions. */
const CARD_PAYMENT_CATEGORY_SNAPSHOT = {
  id: 'SYSTEM_CARD_PAYMENT',
  name: 'Pago de Tarjeta',
  icon: 'card',
};

/**
 * Summary data for a credit card, returned in list views.
 */
export interface CreditCardSummary {
  id: string;
  name: string;
  lastFourDigits: string;
  currency: string;
  currentBalance: number;
  creditLimit: number;
  availableCredit: number;
  utilizationPercentage: number;
  daysUntilCutOff: number;
  daysUntilPayment: number;
  cutOffDay: number;
  paymentDay: number;
}

/**
 * Single billing period with its status and totals.
 */
export interface BillingPeriod {
  startDate: Date;
  endDate: Date;
  totalSpent: number;
  transactionCount: number;
  transactions: Transaction[];
  isPaid: boolean;
  paymentAmount: number | null;
  status: 'OPEN' | 'CLOSED' | 'PAID' | 'PARTIALLY_PAID';
}

/**
 * Category breakdown entry for a billing period.
 */
export interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  transactionCount: number;
  total: number;
}

/**
 * Detailed billing period including category breakdown.
 */
export interface BillingPeriodDetail extends BillingPeriod {
  categoryBreakdown: CategoryBreakdown[];
}

/**
 * Full credit card detail with current period and recent history.
 */
export interface CreditCardDetail extends CreditCardSummary {
  currentPeriodSummary: BillingPeriod;
  recentPayments: Transaction[];
  billingPeriods: BillingPeriod[];
}

/**
 * Payload for paying a credit card.
 */
export interface PayCardDto {
  sourceAccountId: string;
  amount: number;
  date: Date;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
}

/**
 * Service handling all credit card-specific business logic:
 * listing cards with summaries, card detail, billing period statements,
 * card payment (atomic dual balance), and payment history.
 */
export class CreditCardService {
  /**
   * @param {PaymentMethodRepository} paymentMethodRepository Repository for payment methods.
   * @param {TransactionRepository} transactionRepository Repository for transactions.
   */
  constructor(
    private readonly paymentMethodRepository: PaymentMethodRepository,
    private readonly transactionRepository: TransactionRepository
  ) {}

  /**
   * Returns all credit cards for a user with summary info (balance, utilization, days until events).
   *
   * @param {string} userId Authenticated user identifier.
   * @returns {Promise<CreditCardSummary[]>} List of credit card summaries sorted by daysUntilPayment ascending.
   */
  async getAllCards(userId: string): Promise<CreditCardSummary[]> {
    const allMethods = await this.paymentMethodRepository.findAllByUser(userId);
    const creditCards = allMethods.filter((pm) => pm.type === PaymentMethodType.CREDIT_CARD);
    const now = new Date();

    return creditCards
      .map((card) => this.buildCardSummary(card, now))
      .sort((a, b) => a.daysUntilPayment - b.daysUntilPayment);
  }

  /**
   * Returns full detail for a single credit card including current billing period transactions,
   * recent payment history, and a list of recent billing periods.
   *
   * @param {string} userId Authenticated user identifier.
   * @param {string} cardId Credit card payment method identifier.
   * @returns {Promise<CreditCardDetail>} Full card detail object.
   * @throws {NotFoundError} If the card does not exist.
   * @throws {ForbiddenError} If the card does not belong to the user.
   */
  async getCardDetail(userId: string, cardId: string): Promise<CreditCardDetail> {
    const card = await this.ensureCardOwnership(cardId, userId);
    const details = card.details as CreditCardDetails;
    const now = new Date();

    const summary = this.buildCardSummary(card, now);
    const currentPeriod = this.computeCurrentPeriod(details.cut_off_day, now);

    const [periodTransactions, allPayments] = await Promise.all([
      this.transactionRepository.findAllByUser(userId, {
        startDate: currentPeriod.startDate,
        endDate: currentPeriod.endDate,
        paymentMethodId: cardId,
      }),
      this.transactionRepository.findAllByUser(userId, {
        subtype: TransactionSubtype.CARD_PAYMENT,
      }),
    ]);

    const cardPayments = allPayments.filter(
      (t) => t.cardPaymentDetails?.creditCardId === cardId
    );

    const currentPeriodPayments = cardPayments.filter((p) => {
      const pd = p.cardPaymentDetails!;
      return (
        pd.billingPeriodStart.getTime() === currentPeriod.startDate.getTime() ||
        (p.date >= currentPeriod.startDate && p.date <= currentPeriod.endDate)
      );
    });

    const paymentAmount = currentPeriodPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalSpent = periodTransactions.reduce((sum, t) => sum + t.amount, 0);
    const isPeriodOpen = now <= currentPeriod.endDate;

    const currentPeriodSummary: BillingPeriod = {
      startDate: currentPeriod.startDate,
      endDate: currentPeriod.endDate,
      totalSpent,
      transactionCount: periodTransactions.length,
      transactions: periodTransactions,
      isPaid: paymentAmount >= totalSpent && totalSpent > 0,
      paymentAmount: paymentAmount > 0 ? paymentAmount : null,
      status: isPeriodOpen
        ? 'OPEN'
        : paymentAmount === 0
          ? 'CLOSED'
          : paymentAmount >= totalSpent
            ? 'PAID'
            : 'PARTIALLY_PAID',
    };

    // Build last 6 billing periods for the card detail view
    const billingPeriods = await this.buildBillingPeriods(userId, cardId, details.cut_off_day, now, 6);

    return {
      ...summary,
      currentPeriodSummary,
      recentPayments: cardPayments.slice(0, 5),
      billingPeriods,
    };
  }

  /**
   * Returns the last 12 billing periods for a credit card with status and totals.
   *
   * @param {string} userId Authenticated user identifier.
   * @param {string} cardId Credit card payment method identifier.
   * @returns {Promise<BillingPeriod[]>} List of billing periods ordered newest first.
   * @throws {NotFoundError} If the card does not exist.
   * @throws {ForbiddenError} If the card does not belong to the user.
   */
  async getStatements(userId: string, cardId: string): Promise<BillingPeriod[]> {
    const card = await this.ensureCardOwnership(cardId, userId);
    const details = card.details as CreditCardDetails;
    const now = new Date();
    return this.buildBillingPeriods(userId, cardId, details.cut_off_day, now, 12);
  }

  /**
   * Returns the detailed view for a single billing period, including category breakdown.
   *
   * @param {string} userId Authenticated user identifier.
   * @param {string} cardId Credit card payment method identifier.
   * @param {Date} periodStart Start date of the billing period (from route param).
   * @returns {Promise<BillingPeriodDetail>} Detailed billing period with category breakdown.
   * @throws {NotFoundError} If the card does not exist.
   * @throws {ForbiddenError} If the card does not belong to the user.
   */
  async getStatementDetail(userId: string, cardId: string, periodStart: Date): Promise<BillingPeriodDetail> {
    const card = await this.ensureCardOwnership(cardId, userId);
    const details = card.details as CreditCardDetails;
    const now = new Date();

    const periodEnd = this.computePeriodEnd(periodStart, details.cut_off_day);

    const [transactions, allPayments] = await Promise.all([
      this.transactionRepository.findAllByUser(userId, {
        startDate: periodStart,
        endDate: periodEnd,
        paymentMethodId: cardId,
      }),
      this.transactionRepository.findAllByUser(userId, {
        subtype: TransactionSubtype.CARD_PAYMENT,
      }),
    ]);

    const cardPayments = allPayments.filter(
      (t) => t.cardPaymentDetails?.creditCardId === cardId
    );
    const periodPayments = cardPayments.filter((p) => {
      const pd = p.cardPaymentDetails!;
      return pd.billingPeriodStart.getTime() === periodStart.getTime();
    });

    const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0);
    const paymentAmount = periodPayments.reduce((sum, p) => sum + p.amount, 0);
    const isPeriodOpen = now <= periodEnd;

    const status: BillingPeriod['status'] = isPeriodOpen
      ? 'OPEN'
      : paymentAmount === 0
        ? 'CLOSED'
        : paymentAmount >= totalSpent
          ? 'PAID'
          : 'PARTIALLY_PAID';

    const categoryMap = new Map<string, CategoryBreakdown>();
    for (const tx of transactions) {
      const key = tx.category.id;
      const existing = categoryMap.get(key);
      if (existing) {
        existing.total += tx.amount;
        existing.transactionCount += 1;
      } else {
        categoryMap.set(key, {
          categoryId: tx.category.id,
          categoryName: tx.category.name,
          transactionCount: 1,
          total: tx.amount,
        });
      }
    }

    const categoryBreakdown = Array.from(categoryMap.values()).sort((a, b) => b.total - a.total);

    return {
      startDate: periodStart,
      endDate: periodEnd,
      totalSpent,
      transactionCount: transactions.length,
      transactions,
      isPaid: paymentAmount >= totalSpent && totalSpent > 0,
      paymentAmount: paymentAmount > 0 ? paymentAmount : null,
      status,
      categoryBreakdown,
    };
  }

  /**
   * Registers a credit card payment. Atomically:
   * 1. Creates an EXPENSE transaction (subtype=CARD_PAYMENT) from the source bank account.
   * 2. Decreases the credit card's current_balance by the payment amount.
   *
   * @param {string} userId Authenticated user identifier.
   * @param {string} cardId Credit card payment method identifier.
   * @param {PayCardDto} payload Payment payload with source account, amount, date, and period info.
   * @returns {Promise<Transaction>} The created payment transaction.
   * @throws {NotFoundError} If the card or source account does not exist.
   * @throws {ForbiddenError} If either payment method does not belong to the user.
   * @throws {ValidationError} If the source account is not a bank account, or amount is invalid.
   */
  async payCard(userId: string, cardId: string, payload: PayCardDto): Promise<Transaction> {
    const card = await this.ensureCardOwnership(cardId, userId);
    const sourceAccount = await this.paymentMethodRepository.findById(payload.sourceAccountId);

    if (!sourceAccount) {
      throw new NotFoundError('PaymentMethod', payload.sourceAccountId);
    }
    if (sourceAccount.userId !== userId) {
      throw new ForbiddenError('No tienes permiso para usar este método de pago');
    }
    if (sourceAccount.type !== PaymentMethodType.BANK_ACCOUNT) {
      throw new ValidationError('Solo se pueden usar cuentas bancarias para pagar tarjetas de crédito');
    }
    if (payload.amount <= 0) {
      throw new ValidationError('El monto del pago debe ser mayor a cero');
    }

    const cardDetails = card.details as CreditCardDetails;
    const currentBalance = cardDetails.current_balance ?? 0;

    if (payload.amount > currentBalance) {
      throw new ValidationError(
        `El monto del pago ($${payload.amount}) excede el saldo actual de la tarjeta ($${currentBalance})`
      );
    }

    const isFullPayment = payload.amount >= currentBalance;

    const cardPaymentDetails: CardPaymentDetails = {
      creditCardId: cardId,
      isFullPayment,
      billingPeriodStart: payload.billingPeriodStart,
      billingPeriodEnd: payload.billingPeriodEnd,
    };

    // Step 1: Create the payment transaction
    const doc = await TransactionModel.create({
      amount: payload.amount,
      description: isFullPayment ? 'Pago Total de Tarjeta' : 'Pago Parcial de Tarjeta',
      date: payload.date,
      type: TransactionType.EXPENSE,
      subtype: TransactionSubtype.CARD_PAYMENT,
      user: userId,
      category: CARD_PAYMENT_CATEGORY_SNAPSHOT,
      paymentMethod: payload.sourceAccountId,
      isRecurring: false,
      cardPaymentDetails,
    });

    // Step 2: Decrease the credit card balance. If this fails, roll back the transaction.
    const newBalance = Math.max(0, currentBalance - payload.amount);
    try {
      await PaymentMethodModel.findByIdAndUpdate(
        cardId,
        { $set: { 'details.current_balance': newBalance } }
      );
    } catch (balanceError) {
      await TransactionModel.findByIdAndDelete(doc._id);
      throw balanceError;
    }

    // Step 3: Deduct the payment amount from the source bank account balance.
    const bankAccountDetails = sourceAccount.details as BankAccountDetails;
    const bankCurrentBalance = bankAccountDetails.current_balance ?? 0;
    const newBankBalance = Math.max(0, bankCurrentBalance - payload.amount);
    try {
      await PaymentMethodModel.findByIdAndUpdate(
        payload.sourceAccountId,
        { $set: { 'details.current_balance': newBankBalance } }
      );
    } catch (bankError) {
      // Roll back both the transaction and the card balance update
      await TransactionModel.findByIdAndDelete(doc._id);
      await PaymentMethodModel.findByIdAndUpdate(
        cardId,
        { $set: { 'details.current_balance': currentBalance } }
      );
      throw bankError;
    }

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

  /**
   * Returns all CARD_PAYMENT transactions for a specific credit card.
   *
   * @param {string} userId Authenticated user identifier.
   * @param {string} cardId Credit card payment method identifier.
   * @returns {Promise<Transaction[]>} List of card payment transactions ordered by date descending.
   * @throws {NotFoundError} If the card does not exist.
   * @throws {ForbiddenError} If the card does not belong to the user.
   */
  async getPaymentHistory(userId: string, cardId: string): Promise<Transaction[]> {
    await this.ensureCardOwnership(cardId, userId);

    const allCardPayments = await this.transactionRepository.findAllByUser(userId, {
      subtype: TransactionSubtype.CARD_PAYMENT,
    });

    return allCardPayments.filter((t) => t.cardPaymentDetails?.creditCardId === cardId);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Builds a CreditCardSummary from a PaymentMethod and the current date.
   *
   * @param {PaymentMethod} card Credit card payment method.
   * @param {Date} now Current date.
   * @returns {CreditCardSummary} Summary object.
   */
  private buildCardSummary(card: PaymentMethod, now: Date): CreditCardSummary {
    const details = card.details as CreditCardDetails;
    const currentBalance = details.current_balance ?? 0;
    const creditLimit = details.credit_limit ?? 0;
    const availableCredit = Math.max(0, creditLimit - currentBalance);
    const utilizationPercentage = creditLimit > 0 ? (currentBalance / creditLimit) * 100 : 0;

    const { daysUntilCutOff, daysUntilPayment } = this.computeDaysUntilEvents(
      details.cut_off_day,
      details.payment_day,
      now
    );

    const lastFourDigits = details.card_number ? String(details.card_number).slice(-4) : '****';

    return {
      id: card.id!,
      name: card.name,
      lastFourDigits,
      currency: card.currency,
      currentBalance,
      creditLimit,
      availableCredit,
      utilizationPercentage: Math.round(utilizationPercentage * 10) / 10,
      daysUntilCutOff,
      daysUntilPayment,
      cutOffDay: details.cut_off_day,
      paymentDay: details.payment_day,
    };
  }

  /**
   * Computes the number of days until the next cut-off and next payment dates.
   * - Next cut-off: next occurrence of cut_off_day after today.
   * - Next payment: payment_day of the month AFTER the next cut-off month.
   *
   * @param {number} cutOffDay Day of month for the card's cut-off.
   * @param {number} paymentDay Day of month for the card's payment due date.
   * @param {Date} now Current date reference.
   * @returns {{ daysUntilCutOff: number; daysUntilPayment: number }} Days until each event.
   */
  private computeDaysUntilEvents(
    cutOffDay: number,
    paymentDay: number,
    now: Date
  ): { daysUntilCutOff: number; daysUntilPayment: number } {
    const todayDay = now.getDate();
    const todayMonth = now.getMonth();
    const todayYear = now.getFullYear();

    let cutOffYear = todayYear;
    let cutOffMonth = todayMonth;
    if (todayDay >= cutOffDay) {
      cutOffMonth += 1;
      if (cutOffMonth > 11) {
        cutOffMonth = 0;
        cutOffYear += 1;
      }
    }

    const nextCutOff = new Date(cutOffYear, cutOffMonth, cutOffDay);
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysUntilCutOff = Math.round((nextCutOff.getTime() - now.getTime()) / msPerDay);

    let paymentYear = cutOffYear;
    let paymentMonth = cutOffMonth + 1;
    if (paymentMonth > 11) {
      paymentMonth = 0;
      paymentYear += 1;
    }
    const daysInPaymentMonth = new Date(paymentYear, paymentMonth + 1, 0).getDate();
    const finalPaymentDay = Math.min(paymentDay, daysInPaymentMonth);
    const nextPaymentDate = new Date(paymentYear, paymentMonth, finalPaymentDay);
    const daysUntilPayment = Math.round((nextPaymentDate.getTime() - now.getTime()) / msPerDay);

    return { daysUntilCutOff, daysUntilPayment };
  }

  /**
   * Computes the start and end dates of the current open billing period.
   * The current period starts the day after the most recent cut-off and ends on the next cut-off.
   *
   * @param {number} cutOffDay Day of month for the card's cut-off.
   * @param {Date} now Current date reference.
   * @returns {{ startDate: Date; endDate: Date }} Current billing period boundaries.
   */
  private computeCurrentPeriod(cutOffDay: number, now: Date): { startDate: Date; endDate: Date } {
    const todayDay = now.getDate();
    const todayMonth = now.getMonth();
    const todayYear = now.getFullYear();

    let endYear = todayYear;
    let endMonth = todayMonth;
    if (todayDay > cutOffDay) {
      endMonth += 1;
      if (endMonth > 11) {
        endMonth = 0;
        endYear += 1;
      }
    }
    const endDate = new Date(endYear, endMonth, cutOffDay, 23, 59, 59, 999);

    let startYear = endYear;
    let startMonth = endMonth - 1;
    if (startMonth < 0) {
      startMonth = 11;
      startYear -= 1;
    }
    const startDate = new Date(startYear, startMonth, cutOffDay + 1, 0, 0, 0, 0);

    return { startDate, endDate };
  }

  /**
   * Given a period start date, computes the corresponding period end date (next cut-off day).
   *
   * @param {Date} periodStart The first day of the billing period.
   * @param {number} cutOffDay The card's cut-off day.
   * @returns {Date} End date of the billing period.
   */
  private computePeriodEnd(periodStart: Date, cutOffDay: number): Date {
    let endMonth = periodStart.getMonth() + 1;
    let endYear = periodStart.getFullYear();
    if (endMonth > 11) {
      endMonth = 0;
      endYear += 1;
    }
    return new Date(endYear, endMonth, cutOffDay, 23, 59, 59, 999);
  }

  /**
   * Builds an array of billing periods ordered newest first.
   *
   * @param {string} userId Owner identifier.
   * @param {string} cardId Credit card identifier.
   * @param {number} cutOffDay Card cut-off day.
   * @param {Date} now Current date reference.
   * @param {number} count Number of periods to return (default 12).
   * @returns {Promise<BillingPeriod[]>} Array of billing periods.
   */
  private async buildBillingPeriods(
    userId: string,
    cardId: string,
    cutOffDay: number,
    now: Date,
    count: number = 12
  ): Promise<BillingPeriod[]> {
    const allPayments = await this.transactionRepository.findAllByUser(userId, {
      subtype: TransactionSubtype.CARD_PAYMENT,
    });
    const cardPayments = allPayments.filter((t) => t.cardPaymentDetails?.creditCardId === cardId);

    const periods: BillingPeriod[] = [];
    const current = this.computeCurrentPeriod(cutOffDay, now);

    let endDate = current.endDate;
    let startDate = current.startDate;

    for (let i = 0; i < count; i++) {
      const periodStartForQuery = new Date(startDate);
      const periodEndForQuery = new Date(endDate);

      const transactions = await this.transactionRepository.findAllByUser(userId, {
        startDate: periodStartForQuery,
        endDate: periodEndForQuery,
        paymentMethodId: cardId,
      });

      const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0);

      const periodPayments = cardPayments.filter((p) => {
        const pd = p.cardPaymentDetails!;
        return pd.billingPeriodStart.getTime() === startDate.getTime();
      });
      const paymentAmount = periodPayments.reduce((sum, p) => sum + p.amount, 0);

      const isPeriodOpen = now <= endDate;
      const status: BillingPeriod['status'] = isPeriodOpen
        ? 'OPEN'
        : paymentAmount === 0
          ? 'CLOSED'
          : paymentAmount >= totalSpent
            ? 'PAID'
            : 'PARTIALLY_PAID';

      periods.push({
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        totalSpent,
        transactionCount: transactions.length,
        transactions,
        isPaid: paymentAmount >= totalSpent && totalSpent > 0,
        paymentAmount: paymentAmount > 0 ? paymentAmount : null,
        status,
      });

      // Move back one period
      endDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() - 1, 23, 59, 59, 999);
      let prevEndMonth = endDate.getMonth();
      let prevEndYear = endDate.getFullYear();
      startDate = new Date(prevEndYear, prevEndMonth - 1, cutOffDay + 1, 0, 0, 0, 0);
      if (prevEndMonth === 0) {
        startDate = new Date(prevEndYear - 1, 11, cutOffDay + 1, 0, 0, 0, 0);
      }
    }

    return periods;
  }

  /**
   * Validates that a payment method exists, is a credit card, and belongs to the user.
   *
   * @param {string} cardId Payment method identifier.
   * @param {string} userId User identifier.
   * @returns {Promise<PaymentMethod>} The credit card payment method.
   * @throws {NotFoundError} If the payment method does not exist.
   * @throws {ForbiddenError} If it does not belong to the user.
   * @throws {ValidationError} If it is not a credit card.
   */
  private async ensureCardOwnership(cardId: string, userId: string): Promise<PaymentMethod> {
    const card = await this.paymentMethodRepository.findById(cardId);
    if (!card) {
      throw new NotFoundError('PaymentMethod', cardId);
    }
    if (card.userId !== userId) {
      throw new ForbiddenError('No tienes permiso para acceder a esta tarjeta de crédito');
    }
    if (card.type !== PaymentMethodType.CREDIT_CARD) {
      throw new ValidationError('El método de pago especificado no es una tarjeta de crédito');
    }
    return card;
  }
}
