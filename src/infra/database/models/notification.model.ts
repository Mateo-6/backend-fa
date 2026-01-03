import mongoose, { Schema, Document, Types } from 'mongoose';
import { Notification, NotificationPriority } from '../../../domain/notification/types/notification.types';

/**
 * Mongoose document interface for Notification.
 */
export interface INotificationDocument extends Notification, Document {
  _id: Types.ObjectId;
}

/**
 * Mongoose schema for Notification.
 */
const NotificationSchema = new Schema<INotificationDocument>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
    },
    priority: {
      type: String,
      enum: Object.values(NotificationPriority),
      required: true,
      index: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    collection: 'notifications',
    versionKey: false,
    toJSON: {
      /**
       * Shapes the Mongo document when converted to JSON.
       *
       * @param {INotificationDocument} doc Original mongoose document.
       * @param {any} ret Serializable representation.
       * @returns {any} Normalized JSON structure.
       */
      transform: function (doc, ret: any) {
        ret.id = ret._id.toString();
        delete ret._id;
        return ret;
      },
    },
    toObject: {
      /**
       * Shapes the Mongo document when converted to plain objects.
       *
       * @param {INotificationDocument} doc Original mongoose document.
       * @param {any} ret Plain object representation.
       * @returns {any} Normalized object structure.
       */
      transform: function (doc, ret: any) {
        ret.id = ret._id.toString();
        delete ret._id;
        return ret;
      },
    },
  }
);

// Indexes for performance
NotificationSchema.index({ userId: 1, isRead: 1 });
NotificationSchema.index({ userId: 1, createdAt: -1 });

export const NotificationModel =
  mongoose.models.Notification ||
  mongoose.model<INotificationDocument>('Notification', NotificationSchema);

