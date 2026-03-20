import mongoose, { Schema, Document, Types } from 'mongoose';
import { Budget, BudgetPeriod } from '../../../domain/budget/types/budget.types';

/**
 * Mongoose document interface for Budget.
 */
export interface IBudgetDocument extends Omit<Budget, 'id' | 'userId' | 'categoryId'>, Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  categoryId: Types.ObjectId | null;
}

/**
 * Mongoose schema for Budget.
 */
const BudgetSchema = new Schema<IBudgetDocument>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      required: true,
      maxlength: 3,
      uppercase: true,
    },
    period: {
      type: String,
      enum: Object.values(BudgetPeriod),
      required: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
      index: true,
    },
    spent: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    rollover: {
      type: Boolean,
      default: false,
    },
    alertThresholds: {
      type: [Number],
      default: [80, 100],
    },
    alertsSent: {
      type: [Number],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: 'budgets',
    versionKey: false,
    toJSON: {
      transform: function (doc, ret: any) {
        ret.id = ret._id.toString();
        ret.userId = ret.user?.toString();
        ret.categoryId = ret.categoryId ? ret.categoryId.toString() : null;
        delete ret._id;
        delete ret.user;
        return ret;
      },
    },
    toObject: {
      transform: function (doc, ret: any) {
        ret.id = ret._id.toString();
        ret.userId = ret.user?.toString();
        ret.categoryId = ret.categoryId ? ret.categoryId.toString() : null;
        delete ret._id;
        delete ret.user;
        return ret;
      },
    },
  }
);

// Compound indexes
BudgetSchema.index({ user: 1, isActive: 1 });
BudgetSchema.index({ user: 1, categoryId: 1, startDate: 1 });
BudgetSchema.index({ endDate: 1, isActive: 1 });

export const BudgetModel =
  mongoose.models.Budget || mongoose.model<IBudgetDocument>('Budget', BudgetSchema);
