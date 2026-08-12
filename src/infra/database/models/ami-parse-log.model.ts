import mongoose, { Schema, Document } from 'mongoose';

/**
 * Mongoose document interface for AMI parse log telemetry records.
 */
export interface IAmiParseLogDocument extends Document {
  parseId: string;
  userId: string;
  inputText: string;
  rawOpenAiResponse: Record<string, unknown>;
  detectedFields: Record<string, unknown>;
  durationMs: number;
  openAiTokensUsed: number;
  createdAt: Date;
}

/**
 * Schema for persisting AMI parse attempt telemetry.
 * Written non-blocking (fire-and-forget) from AmiService.
 */
const AmiParseLogSchema = new Schema<IAmiParseLogDocument>(
  {
    parseId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    inputText: {
      type: String,
      required: true,
    },
    rawOpenAiResponse: {
      type: Schema.Types.Mixed,
    },
    detectedFields: {
      type: Schema.Types.Mixed,
    },
    durationMs: {
      type: Number,
    },
    openAiTokensUsed: {
      type: Number,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: 'ami_parse_logs',
    versionKey: false,
    // Disable automatic timestamps — we manage createdAt manually for clarity
    timestamps: false,
  }
);

export const AmiParseLogModel =
  mongoose.models.AmiParseLog ||
  mongoose.model<IAmiParseLogDocument>('AmiParseLog', AmiParseLogSchema);
