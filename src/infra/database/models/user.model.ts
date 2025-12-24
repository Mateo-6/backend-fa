import mongoose, { Schema, Document, Types } from 'mongoose';
import { User } from '../../../domain/user/types/user.types';

// Interface for MongoDB document - extends User to maintain consistency
export interface IUserDocument extends User, Document {
  categories: Types.ObjectId[];
  expoPushTokens: string[];
  _id: Types.ObjectId;
}

// Mongoose Schema
const UserSchema = new Schema<IUserDocument>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    categories: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: 'Category',
        },
      ],
      default: [],
    },
    expoPushTokens: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true, // Automatic createdAt and updatedAt
    collection: 'users', // Collection name
    versionKey: false, // Disable __v field
    toJSON: {
      /**
       * Normalizes the Mongo document when converted to JSON responses.
       *
       * @param {IUserDocument} doc Original mongoose document.
       * @param {any} ret Serializable representation.
       * @returns {any} Normalized representation.
       */
      transform: function (doc, ret: any) {
        ret.id = ret._id.toString();
        ret.categories =
          Array.isArray(ret.categories) && ret.categories.length > 0
            ? ret.categories.map((categoryId: Types.ObjectId) => categoryId.toString())
            : [];
        //delete ret.password;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      /**
       * Normalizes the Mongo document when converted to plain objects.
       *
       * @param {IUserDocument} doc Original mongoose document.
       * @param {any} ret Plain object representation.
       * @returns {any} Normalized representation.
       */
      transform: function (doc, ret: any) {
        ret.id = ret._id.toString();
        ret.categories =
          Array.isArray(ret.categories) && ret.categories.length > 0
            ? ret.categories.map((categoryId: Types.ObjectId) => categoryId.toString())
            : [];
        //delete ret.password;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Create and export the model (avoid duplicate registration)
export const UserModel = mongoose.models.User || mongoose.model<IUserDocument>('User', UserSchema);

