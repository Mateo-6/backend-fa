import { z } from 'zod';
import { TransactionType } from '../../../domain/finance/types/transaction.types';

/**
 * Schema for creating a new transaction.
 * Payment method is required only for EXPENSE transactions.
 */
export const createTransactionSchema: z.ZodType<{
  amount: number;
  description: string;
  date: string | Date;
  type: TransactionType;
  categoryId: string;
  paymentMethodId?: string;
}> = z
  .object({
    amount: z.number().positive('Amount must be positive'),
    description: z.string().min(1, 'Description is required').max(500, 'Description must be less than 500 characters'),
    date: z
      .union([z.string(), z.date()])
      .transform((val) => (typeof val === 'string' ? new Date(val) : val))
      .refine((val) => !isNaN(val.getTime()), { message: 'Invalid date format' }),
    type: z.nativeEnum(TransactionType, {
      errorMap: () => ({ message: 'Type must be either INCOME or EXPENSE' }),
    }),
    categoryId: z.string().min(1, 'Category ID is required'),
    paymentMethodId: z.string().min(1, 'Payment method ID is required').optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === TransactionType.EXPENSE && (!data.paymentMethodId || data.paymentMethodId.trim() === '')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Payment method ID is required for EXPENSE transactions',
        path: ['paymentMethodId'],
      });
    }
  });

export type CreateTransactionDto = z.infer<typeof createTransactionSchema>;

