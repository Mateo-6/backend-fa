import { z } from 'zod';
import { BudgetPeriod } from '../../../domain/budget/types/budget.types';

/**
 * Schema for creating a new budget.
 */
export const createBudgetSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es requerido')
    .max(100, 'El nombre debe tener menos de 100 caracteres'),
  amount: z.number().positive('El monto debe ser mayor que 0'),
  currency: z
    .string()
    .length(3, 'La moneda debe tener exactamente 3 caracteres')
    .transform((val) => val.toUpperCase()),
  period: z.nativeEnum(BudgetPeriod, {
    message: 'El período debe ser WEEKLY, MONTHLY o YEARLY',
  }),
  categoryId: z.string().nullable().optional().default(null),
  startDate: z
    .union([z.string(), z.date()])
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      const dateStr = typeof val === 'string' ? val.split('T')[0] : val.toISOString().split('T')[0];
      return new Date(`${dateStr}T00:00:00.000Z`);
    })
    .refine((val) => !val || !isNaN(val.getTime()), { message: 'Formato de fecha inválido' }),
  rollover: z.boolean().optional().default(false),
  alertThresholds: z
    .array(z.number().min(1).max(100))
    .optional()
    .default([80, 100]),
});

export type CreateBudgetDto = z.infer<typeof createBudgetSchema>;
