import { z } from 'zod';
import { TransactionType } from '../../../domain/finance/types/transaction.types';

/**
 * Schema for updating a transaction.
 * All fields are optional, but at least one field must be provided.
 * Payment method is optional even for updates, but if provided for EXPENSE, it must be valid.
 */
export const updateTransactionSchema: z.ZodType<{
  amount?: number;
  description?: string;
  date?: string | Date;
  type?: TransactionType;
  categoryId?: string;
  paymentMethodId?: string;
  sourcePaymentMethodId?: string;
  destinationPaymentMethodId?: string;
  budgetAmount?: number | null;
}> = z
  .object({
    amount: z.number().positive('El monto debe ser positivo').optional(),
    description: z
      .string()
      .min(1, 'La descripción es requerida')
      .max(500, 'La descripción debe tener menos de 500 caracteres')
      .optional(),
    date: z
      .union([z.string(), z.date()])
      .transform((val) => (val instanceof Date ? val : new Date(val)))
      .refine((val) => !isNaN(val.getTime()), { message: 'Formato de fecha inválido' })
      .optional(),
    type: z.nativeEnum(TransactionType, { message: 'Tipo de transacción inválido' }).optional(),
    categoryId: z.string().min(1, 'El ID de categoría es requerido').optional(),
    paymentMethodId: z.string().min(1, 'El ID del método de pago es requerido').optional(),
    sourcePaymentMethodId: z.string().min(1, 'El ID del método de pago origen es requerido').optional(),
    destinationPaymentMethodId: z.string().min(1, 'El ID del método de pago destino es requerido').optional(),
    budgetAmount: z.number().min(0, 'El monto al presupuesto no puede ser negativo').nullable().optional(),
  })
  .refine(
    (data) =>
      typeof data.amount === 'number' ||
      typeof data.description === 'string' ||
      typeof data.date !== 'undefined' ||
      typeof data.type === 'string' ||
      typeof data.categoryId === 'string' ||
      typeof data.paymentMethodId === 'string' ||
      typeof data.sourcePaymentMethodId === 'string' ||
      typeof data.destinationPaymentMethodId === 'string' ||
      data.budgetAmount !== undefined,
    'Proporciona al menos un campo para actualizar'
  );

export type UpdateTransactionDto = z.infer<typeof updateTransactionSchema>;


