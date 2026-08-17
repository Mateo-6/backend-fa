import { z } from 'zod';
import { BudgetPeriod } from '../../../domain/budget/types/budget.types';

/**
 * Schema for updating an existing budget.
 * All budget fields are mutable; structural changes (period, categoryId, startDate)
 * recompute endDate and recalculate spent on the service layer.
 */
export const updateBudgetSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es requerido')
    .max(100, 'El nombre debe tener menos de 100 caracteres')
    .optional(),
  amount: z.number().positive('El monto debe ser mayor que 0').optional(),
  currency: z
    .string()
    .length(3, 'La moneda debe tener exactamente 3 caracteres')
    .transform((val) => val.toUpperCase())
    .optional(),
  period: z
    .nativeEnum(BudgetPeriod, {
      message: 'El período debe ser WEEKLY, MONTHLY o YEARLY',
    })
    .optional(),
  categoryId: z.string().nullable().optional(),
  startDate: z
    .union([z.string(), z.date()])
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      const dateStr = typeof val === 'string' ? val.split('T')[0] : val.toISOString().split('T')[0];
      return new Date(`${dateStr}T00:00:00.000Z`);
    })
    .refine((val) => !val || !isNaN(val.getTime()), { message: 'Formato de fecha inválido' }),
  alertThresholds: z.array(z.number().min(1).max(100)).optional(),
  rollover: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export type UpdateBudgetDto = z.infer<typeof updateBudgetSchema>;