import { z } from 'zod';

/**
 * Schema for updating an existing budget.
 * Only mutable fields are allowed — period and categoryId are immutable after creation.
 */
export const updateBudgetSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es requerido')
    .max(100, 'El nombre debe tener menos de 100 caracteres')
    .optional(),
  amount: z.number().positive('El monto debe ser mayor que 0').optional(),
  alertThresholds: z.array(z.number().min(1).max(100)).optional(),
  rollover: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export type UpdateBudgetDto = z.infer<typeof updateBudgetSchema>;
