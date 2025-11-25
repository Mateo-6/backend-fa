import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { UserBase } from '../../../domain/user/types/user.types';

// Interface for MongoDB document - extends UserBase to maintain consistency
export interface IUserDocument extends Omit<Document, '_id'>, UserBase {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
}

// Mongoose Schema
const UserSchema = new Schema<IUserDocument>(
  {
    _id: {
      type: String,
      default: () => uuidv4(),
    },
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
    _id: true, // Use custom _id
    timestamps: true, // Automatic createdAt and updatedAt
    collection: 'users', // Collection name
  }
);

// Create and export the model (avoid duplicate registration)
export const UserModel = mongoose.models.User || mongoose.model<IUserDocument>('User', UserSchema);

