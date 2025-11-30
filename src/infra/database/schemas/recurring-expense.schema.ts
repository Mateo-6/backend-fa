import mongoose, { Schema, Document, Types } from 'mongoose';
import { RecurringExpense, RecurringFrequency } from '../../../domain/finance/types/recurring-expense.types';

/**
 * Mongoose document interface for RecurringExpense.
 */
export interface IRecurringExpenseDocument extends Omit<RecurringExpense, 'userId' | 'categoryId'>, Document {
  user: Types.ObjectId;
  category: Types.ObjectId;
}

/**
 * Mongoose schema for RecurringExpense.
 */
const RecurringExpenseSchema = new Schema<IRecurringExpenseDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    paymentMethodId: {
      type: String,
      default: null,
    },
    frequency: {
      type: String,
      enum: Object.values(RecurringFrequency),
      required: true,
    },
    payDay: {
      type: Number,
      required: true,
      min: 1,
      max: 31,
    },
    startDate: {
      type: Date,
      required: true,
    },
    nextPaymentDate: {
      type: Date,
      required: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'recurring_expenses',
    versionKey: false,
    toJSON: {
      /**
       * Shapes the Mongo document when converted to JSON.
       *
       * @param {IRecurringExpenseDocument} doc Original mongoose document.
       * @param {any} ret Serializable representation.
       * @returns {any} Normalized JSON structure.
       */
      transform: function (doc, ret: any) {
        ret.id = ret._id.toString();
        ret.userId = ret.user?.toString();
        ret.categoryId = ret.category?.toString();
        delete ret._id;
        delete ret.user;
        delete ret.category;
        return ret;
      },
    },
    toObject: {
      /**
       * Shapes the Mongo document when converted to plain objects.
       *
       * @param {IRecurringExpenseDocument} doc Original mongoose document.
       * @param {any} ret Plain object representation.
       * @returns {any} Normalized object structure.
       */
      transform: function (doc, ret: any) {
        ret.id = ret._id.toString();
        ret.userId = ret.user?.toString();
        ret.categoryId = ret.category?.toString();
        delete ret._id;
        delete ret.user;
        delete ret.category;
        return ret;
      },
    },
  }
);

// Indexes for performance
RecurringExpenseSchema.index({ user: 1, isActive: 1 });
RecurringExpenseSchema.index({ nextPaymentDate: 1, isActive: 1 });

export const RecurringExpenseModel =
  mongoose.models.RecurringExpense ||
  mongoose.model<IRecurringExpenseDocument>('RecurringExpense', RecurringExpenseSchema);

