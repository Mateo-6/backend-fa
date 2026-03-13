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
    amount: z.number().positive('El monto debe ser positivo').optional(),
    description: z
      .string()
      .min(1, 'La descripción es requerida')
      .max(500, 'La descripción debe tener menos de 500 caracteres')
      .optional(),
    date: z
      .union([z.string(), z.date()])
      .transform((val) => {
        // Extract only the YYYY-MM-DD portion to avoid timezone shift when storing in UTC
        const dateStr = typeof val === 'string' ? val.split('T')[0] : val.toISOString().split('T')[0];
        return new Date(`${dateStr}T00:00:00.000Z`);
      })
      .refine((val) => !isNaN(val.getTime()), { message: 'Formato de fecha inválido' })
      .optional(),
    categoryId: z.string().min(1, 'El ID de categoría es requerido').optional(),
    paymentMethodId: z.string().min(1, 'El ID del método de pago es requerido').optional(),
  })
  .refine(
    (data) =>
      typeof data.amount === 'number' ||
      typeof data.description === 'string' ||
      typeof data.date !== 'undefined' ||
      typeof data.categoryId === 'string' ||
      typeof data.paymentMethodId === 'string',
    'Proporciona al menos un campo para actualizar'
  );

export type UpdateTransactionDto = z.infer<typeof updateTransactionSchema>;


