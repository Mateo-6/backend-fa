import { z } from 'zod';

export const ParseIntentRequestSchema = z.object({
  text: z.string().min(15, 'El texto debe tener al menos 15 caracteres').max(500),
});

export type ParseIntentRequest = z.infer<typeof ParseIntentRequestSchema>;

/**
 * A single field detected by the AMI parsing engine.
 * - detected: false means AMI did not find any signal for this field.
 * - detected: true, confidence: 'high' means the match is strong.
 * - detected: true, confidence: 'low' means the match is uncertain.
 */
export interface AmiDetectedField<T> {
  value: T | null;
  confidence: 'high' | 'low' | null;
  detected: boolean;
}

/**
 * Response returned by the parse-intent endpoint.
 * Contains 13 detected fields, each with a confidence level.
 */
export interface ParseIntentResponse {
  parseId: string;
  detectedFields: {
    amount: AmiDetectedField<number>;
    description: AmiDetectedField<string>;
    date: AmiDetectedField<string>;
    type: AmiDetectedField<string>;
    categoryId: AmiDetectedField<string>;
    paymentMethodId: AmiDetectedField<string>;
    isRecurring: AmiDetectedField<boolean>;
    recurringFrequency: AmiDetectedField<string>;
    recurringPayDay: AmiDetectedField<number>;
    applyToBudget: AmiDetectedField<boolean>;
    budgetAmountInput: AmiDetectedField<number>;
    transferSourceId: AmiDetectedField<string>;
    transferDestinationId: AmiDetectedField<string>;
  };
}
