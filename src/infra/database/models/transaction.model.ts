import mongoose, { Schema, Document, Types } from 'mongoose';
import { Transaction, TransactionType, CategorySnapshot } from '../../../domain/finance/types/transaction.types';
import { TransactionSubtype } from 'fa-contracts';

/**
 * Embedded sub-document for card payment details.
 */
export interface ICardPaymentDetails {
  creditCardId: string;
  isFullPayment: boolean;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
}

/**
 * Mongoose document interface for Transaction.
 */
export interface ITransactionDocument extends Omit<Transaction, 'userId' | 'recurringExpenseId' | 'paymentMethodId' | 'sourcePaymentMethodId' | 'destinationPaymentMethodId' | 'subtype' | 'cardPaymentDetails'>, Document {
  user: Types.ObjectId;
  recurringExpense?: Types.ObjectId;
  paymentMethod?: Types.ObjectId;
  sourcePaymentMethod?: Types.ObjectId | null;
  destinationPaymentMethod?: Types.ObjectId | null;
  subtype?: TransactionSubtype | null;
  cardPaymentDetails?: ICardPaymentDetails | null;
}

/**
 * Schema for embedded category snapshot.
 */
const CategorySnapshotSchema = new Schema<CategorySnapshot>(
  {
    id: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    icon: {
      type: String,
      default: null,
    },
  },
  {
    _id: false,
  }
);

/**
 * Schema for embedded card payment details.
 */
const CardPaymentDetailsSchema = new Schema<ICardPaymentDetails>(
  {
    creditCardId: { type: String, required: true },
    isFullPayment: { type: Boolean, required: true },
    billingPeriodStart: { type: Date, required: true },
    billingPeriodEnd: { type: Date, required: true },
  },
  { _id: false }
);

/**
 * Mongoose schema for Transaction.
 */
const TransactionSchema = new Schema<ITransactionDocument>(
  {
    amount: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(TransactionType),
      required: true,
      index: true,
    },
    subtype: {
      type: String,
      enum: [...Object.values(TransactionSubtype), null],
      default: null,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    category: {
      type: CategorySnapshotSchema,
      required: true,
    },
    paymentMethod: {
      type: Schema.Types.ObjectId,
      ref: 'PaymentMethod',
      required: false,
      default: null,
      index: true,
    },
    isRecurring: {
      type: Boolean,
      default: false,
      index: true,
    },
    recurringExpense: {
      type: Schema.Types.ObjectId,
      ref: 'RecurringExpense',
      default: null,
    },
    sourcePaymentMethod: {
      type: Schema.Types.ObjectId,
      ref: 'PaymentMethod',
      required: false,
      default: null,
    },
    destinationPaymentMethod: {
      type: Schema.Types.ObjectId,
      ref: 'PaymentMethod',
      required: false,
      default: null,
    },
    cardPaymentDetails: {
      type: CardPaymentDetailsSchema,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'transactions',
    versionKey: false,
    toJSON: {
      /**
       * Shapes the Mongo document when converted to JSON.
       *
       * @param {ITransactionDocument} doc Original mongoose document.
       * @param {any} ret Serializable representation.
       * @returns {any} Normalized JSON structure.
       */
      transform: function (doc, ret: any) {
        ret.id = ret._id.toString();
        ret.userId = ret.user?.toString();
        ret.paymentMethodId = ret.paymentMethod?.toString() || undefined;
        ret.recurringExpenseId = ret.recurringExpense?.toString() || undefined;
        ret.sourcePaymentMethodId = ret.sourcePaymentMethod?.toString() || undefined;
        ret.destinationPaymentMethodId = ret.destinationPaymentMethod?.toString() || undefined;
        delete ret._id;
        delete ret.user;
        delete ret.paymentMethod;
        delete ret.recurringExpense;
        delete ret.sourcePaymentMethod;
        delete ret.destinationPaymentMethod;
        return ret;
      },
    },
    toObject: {
      /**
       * Shapes the Mongo document when converted to plain objects.
       *
       * @param {ITransactionDocument} doc Original mongoose document.
       * @param {any} ret Plain object representation.
       * @returns {any} Normalized object structure.
       */
      transform: function (doc, ret: any) {
        ret.id = ret._id.toString();
        ret.userId = ret.user?.toString();
        ret.paymentMethodId = ret.paymentMethod?.toString() || undefined;
        ret.recurringExpenseId = ret.recurringExpense?.toString() || undefined;
        ret.sourcePaymentMethodId = ret.sourcePaymentMethod?.toString() || undefined;
        ret.destinationPaymentMethodId = ret.destinationPaymentMethod?.toString() || undefined;
        delete ret._id;
        delete ret.user;
        delete ret.paymentMethod;
        delete ret.recurringExpense;
        delete ret.sourcePaymentMethod;
        delete ret.destinationPaymentMethod;
        return ret;
      },
    },
  }
);

// Indexes for performance
TransactionSchema.index({ user: 1, date: -1 });
TransactionSchema.index({ user: 1, type: 1, date: -1 });
TransactionSchema.index({ user: 1, 'category.id': 1, date: -1 });
TransactionSchema.index({ user: 1, paymentMethod: 1, date: -1 });
TransactionSchema.index({ user: 1, subtype: 1, date: -1 });
TransactionSchema.index({ 'cardPaymentDetails.creditCardId': 1, date: -1 });

export const TransactionModel =
  mongoose.models.Transaction || mongoose.model<ITransactionDocument>('Transaction', TransactionSchema);

