import mongoose, { Schema, Document, Types } from 'mongoose';
import { Category } from '../../../domain/category/types/category.types';

export interface ICategoryDocument extends Omit<Category, 'userId'>, Document {
  user: Types.ObjectId;
}

const CategorySchema = new Schema<ICategoryDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: null,
      trim: true,
    },
    type: {
      type: String,
      enum: ['income', 'expense', 'transfer'],
      required: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    collection: 'categories',
    versionKey: false,
    toJSON: {
      /**
       * Shapes the Mongo document when converted to JSON.
       *
       * @param {ICategoryDocument} doc Original mongoose document.
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
       * @param {ICategoryDocument} doc Original mongoose document.
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

export const CategoryModel =
  mongoose.models.Category || mongoose.model<ICategoryDocument>('Category', CategorySchema);

