import { z } from 'zod';

/**
 * Zod schema for the pay-card endpoint payload.
 */
export const payCardSchema = z.object({
  sourceAccountId: z
    .string({ error: 'La cuenta de origen es requerida' })
    .min(1, 'La cuenta de origen no puede estar vacía'),
  amount: z
    .number({ error: 'El monto es requerido' })
    .positive('El monto debe ser mayor a cero'),
  date: z.coerce.date({ error: 'La fecha es requerida' }),
  billingPeriodStart: z.coerce.date({
    error: 'La fecha de inicio del periodo de facturación es requerida',
  }),
  billingPeriodEnd: z.coerce.date({
    error: 'La fecha de fin del periodo de facturación es requerida',
  }),
}).refine((data) => data.billingPeriodEnd > data.billingPeriodStart, {
  message: 'La fecha de fin del periodo debe ser posterior a la fecha de inicio',
  path: ['billingPeriodEnd'],
});

/**
 * Inferred type from the pay-card Zod schema.
 */
export type PayCardDto = z.infer<typeof payCardSchema>;
