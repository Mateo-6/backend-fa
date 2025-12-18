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
    amount: z.number().positive('El monto debe ser positivo'),
    description: z.string().min(1, 'La descripción es requerida').max(500, 'La descripción debe tener menos de 500 caracteres'),
    date: z
      .union([z.string(), z.date()])
      .transform((val) => (typeof val === 'string' ? new Date(val) : val))
      .refine((val) => !isNaN(val.getTime()), { message: 'Formato de fecha inválido' }),
    type: z.nativeEnum(TransactionType, {
      errorMap: () => ({ message: 'El tipo debe ser INCOME o EXPENSE' }),
    }),
    categoryId: z.string().min(1, 'El ID de categoría es requerido'),
    paymentMethodId: z.string().min(1, 'El ID del método de pago es requerido').optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === TransactionType.EXPENSE && (!data.paymentMethodId || data.paymentMethodId.trim() === '')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'El ID del método de pago es requerido para transacciones de tipo EXPENSE',
        path: ['paymentMethodId'],
      });
    }
  });

export type CreateTransactionDto = z.infer<typeof createTransactionSchema>;

