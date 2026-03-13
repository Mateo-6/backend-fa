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
  name: z.string().min(1, 'El nombre es requerido').max(100, 'El nombre debe tener menos de 100 caracteres'),
  amount: z.number().positive('El monto debe ser positivo'),
  currency: z.string().min(1, 'La moneda es requerida').max(10, 'El código de moneda debe tener menos de 10 caracteres'),
  categoryId: z.string().min(1, 'El ID de categoría es requerido'),
  paymentMethodId: z.string().min(1, 'El ID del método de pago es requerido'),
  frequency: z.nativeEnum(RecurringFrequency, {
    message: 'La frecuencia debe ser WEEKLY, MONTHLY o YEARLY',
  }),
  payDay: z.number().int('El día de pago debe ser un número entero').min(1, 'El día de pago debe estar entre 1 y 31').max(31, 'El día de pago debe estar entre 1 y 31'),
  startDate: z
    .union([z.string(), z.date()])
    .transform((val) => {
      // Extract only the YYYY-MM-DD portion to avoid timezone shift when storing in UTC
      const dateStr = typeof val === 'string' ? val.split('T')[0] : val.toISOString().split('T')[0];
      return new Date(`${dateStr}T00:00:00.000Z`);
    })
    .refine((val) => !isNaN(val.getTime()), { message: 'Formato de fecha inválido' }),
});

export type CreateRecurringDto = z.infer<typeof createRecurringSchema>;

