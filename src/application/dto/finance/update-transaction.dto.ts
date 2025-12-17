import { z } from 'zod';

/**
 * Schema for updating a transaction.
 * All fields are optional, but at least one field must be provided.
 * Payment method is optional even for updates, but if provided for EXPENSE, it must be valid.
 */
export const updateTransactionSchema: z.ZodType<{
  amount?: number;
  description?: string;
  date?: string | Date;
  categoryId?: string;
  paymentMethodId?: string;
}> = z
  .object({
    amount: z.number().positive('Amount must be positive').optional(),
    description: z
      .string()
      .min(1, 'Description is required')
      .max(500, 'Description must be less than 500 characters')
      .optional(),
    date: z
      .union([z.string(), z.date()])
      .transform((val) => (typeof val === 'string' ? new Date(val) : val))
      .refine((val) => !isNaN(val.getTime()), { message: 'Invalid date format' })
      .optional(),
    categoryId: z.string().min(1, 'Category ID is required').optional(),
    paymentMethodId: z.string().min(1, 'Payment method ID is required').optional(),
  })
  .refine(
    (data) =>
      typeof data.amount === 'number' ||
      typeof data.description === 'string' ||
      typeof data.date !== 'undefined' ||
      typeof data.categoryId === 'string' ||
      typeof data.paymentMethodId === 'string',
    'Provide at least one field to update'
  );

export type UpdateTransactionDto = z.infer<typeof updateTransactionSchema>;


