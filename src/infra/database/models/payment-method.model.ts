import mongoose, { Schema, Document, Types } from 'mongoose';
import { PaymentMethod, PaymentMethodType } from '../../../domain/payment-method/types/payment-method.types';

/**
 * Mongoose document interface for PaymentMethod.
 */
export interface IPaymentMethodDocument extends Omit<PaymentMethod, 'userId'>, Document {
  user: Types.ObjectId;
}

/**
 * Mongoose schema for PaymentMethod.
 * Uses a flexible Mixed type for the polymorphic details field.
 */
const PaymentMethodSchema = new Schema<IPaymentMethodDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: Object.values(PaymentMethodType),
      required: true,
      index: true,
    },
    currency: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      minlength: 3,
      maxlength: 3,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    details: {
      type: Schema.Types.Mixed,
      required: true,
    },
  },
  {
    timestamps: true,
    collection: 'payment_methods',
    versionKey: false,
    toJSON: {
      /**
       * Shapes the Mongo document when converted to JSON.
       *
       * @param {IPaymentMethodDocument} doc Original mongoose document.
       * @param {any} ret Serializable representation.
       * @returns {any} Normalized JSON structure.
       */
      transform: function (doc, ret: any) {
        ret.id = ret._id.toString();
        ret.userId = ret.user?.toString();
        delete ret._id;
        delete ret.user;
        return ret;
      },
    },
    toObject: {
      /**
       * Shapes the Mongo document when converted to plain objects.
       *
       * @param {IPaymentMethodDocument} doc Original mongoose document.
       * @param {any} ret Plain object representation.
       * @returns {any} Normalized object structure.
       */
      transform: function (doc, ret: any) {
        ret.id = ret._id.toString();
        ret.userId = ret.user?.toString();
        delete ret._id;
        delete ret.user;
        return ret;
      },
    },
  }
);

// Indexes for performance
PaymentMethodSchema.index({ user: 1, type: 1 });
PaymentMethodSchema.index({ user: 1, createdAt: -1 });

export const PaymentMethodModel =
  mongoose.models.PaymentMethod ||
  mongoose.model<IPaymentMethodDocument>('PaymentMethod', PaymentMethodSchema);

