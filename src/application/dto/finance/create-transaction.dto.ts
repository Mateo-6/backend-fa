import { z } from 'zod';
import { TransactionType } from '../../../domain/finance/types/transaction.types';

/**
 * Schema for creating a new transaction.
 * - EXPENSE: paymentMethodId is required.
 * - INCOME: paymentMethodId is optional.
 * - TRANSFER: sourcePaymentMethodId and destinationPaymentMethodId are required; paymentMethodId must not be provided.
 */
export const createTransactionSchema = z
  .object({
    amount: z.number().positive('El monto debe ser positivo'),
    description: z.string().min(1, 'La descripción es requerida').max(500, 'La descripción debe tener menos de 500 caracteres'),
    date: z
      .union([z.string(), z.date()])
      .transform((val) => (val instanceof Date ? val : new Date(val)))
      .refine((val) => !isNaN(val.getTime()), { message: 'Formato de fecha inválido' }),
    type: z.nativeEnum(TransactionType, {
      message: 'El tipo debe ser INCOME, EXPENSE o TRANSFER',
    }),
    categoryId: z.string().min(1, 'El ID de categoría es requerido'),
    paymentMethodId: z.string().min(1, 'El ID del método de pago es requerido').optional(),
    sourcePaymentMethodId: z.string().min(1, 'El ID del método de pago origen es requerido').optional(),
    destinationPaymentMethodId: z.string().min(1, 'El ID del método de pago destino es requerido').optional(),
    budgetAmount: z.number().min(0, 'El monto al presupuesto no puede ser negativo').nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === TransactionType.TRANSFER) {
      if (!data.sourcePaymentMethodId || data.sourcePaymentMethodId.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'El ID del método de pago origen es requerido para transferencias',
          path: ['sourcePaymentMethodId'],
        });
      }
      if (!data.destinationPaymentMethodId || data.destinationPaymentMethodId.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'El ID del método de pago destino es requerido para transferencias',
          path: ['destinationPaymentMethodId'],
        });
      }
      if (data.paymentMethodId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'No se debe proporcionar paymentMethodId para transferencias',
          path: ['paymentMethodId'],
        });
      }
    } else if (data.type === TransactionType.EXPENSE && (!data.paymentMethodId || data.paymentMethodId.trim() === '')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'El ID del método de pago es requerido para transacciones de tipo EXPENSE',
        path: ['paymentMethodId'],
      });
    }
  });

export type CreateTransactionDto = z.infer<typeof createTransactionSchema>;
