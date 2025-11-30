import { z } from 'zod';
import { RecurringFrequency } from '../../../domain/finance/types/recurring-expense.types';

/**
 * Schema for creating a new recurring expense.
 */
export const createRecurringSchema: z.ZodType<{
  name: string;
  amount: number;
  currency: string;
  categoryId: string;
  paymentMethodId: string;
  frequency: RecurringFrequency;
  payDay: number;
  startDate: string | Date;
}> = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().min(1, 'Currency is required').max(10, 'Currency code must be less than 10 characters'),
  categoryId: z.string().min(1, 'Category ID is required'),
  paymentMethodId: z.string().min(1, 'Payment method ID is required'),
  frequency: z.nativeEnum(RecurringFrequency, {
    errorMap: () => ({ message: 'Frequency must be WEEKLY, MONTHLY, or YEARLY' }),
  }),
  payDay: z.number().int('Pay day must be an integer').min(1, 'Pay day must be between 1 and 31').max(31, 'Pay day must be between 1 and 31'),
  startDate: z
    .union([z.string(), z.date()])
    .transform((val) => (typeof val === 'string' ? new Date(val) : val))
    .refine((val) => !isNaN(val.getTime()), { message: 'Invalid date format' }),
});

export type CreateRecurringDto = z.infer<typeof createRecurringSchema>;

