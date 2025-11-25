import mongoose, { Schema, Document, Types } from 'mongoose';
import { User } from '../../../domain/user/types/user.types';

// Interface for MongoDB document - extends User to maintain consistency
export interface IUserDocument extends User, Document {
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
  },
  {
    timestamps: true, // Automatic createdAt and updatedAt
    collection: 'users', // Collection name
    versionKey: false, // Disable __v field
    toJSON: {
      transform: function (doc, ret: any) {
        ret.id = ret._id.toString();
        delete ret.password;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform: function (doc, ret: any) {
        ret.id = ret._id.toString();
        delete ret.password;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Create and export the model (avoid duplicate registration)
export const UserModel = mongoose.models.User || mongoose.model<IUserDocument>('User', UserSchema);

