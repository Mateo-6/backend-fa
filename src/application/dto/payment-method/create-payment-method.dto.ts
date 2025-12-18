import { z } from 'zod';
import { PaymentMethodType, BankAccountType } from '../../../domain/payment-method/types/payment-method.types';

/**
 * Schema for credit card details validation.
 */
const creditCardDetailsSchema = z.object({
  card_number: z
    .string()
    .min(4, 'El número de tarjeta debe tener al menos 4 dígitos')
    .max(4, 'El número de tarjeta debe tener exactamente 4 dígitos')
    .regex(/^\d+$/, 'El número de tarjeta debe contener solo dígitos'),
  cut_off_day: z
    .number()
    .int()
    .min(1, 'El día de corte debe estar entre 1 y 31')
    .max(31, 'El día de corte debe estar entre 1 y 31'),
  payment_day: z
    .number()
    .int()
    .min(1, 'El día de pago debe estar entre 1 y 31')
    .max(31, 'El día de pago debe estar entre 1 y 31'),
  credit_limit: z.number().min(0, 'El límite de crédito debe ser un número positivo'),
  current_balance: z.number().min(0, 'El saldo actual debe ser un número positivo'),
});

/**
 * Schema for bank account details validation.
 */
const bankAccountDetailsSchema = z.object({
  bank_name: z.string().min(1, 'El nombre del banco es requerido').max(100, 'El nombre del banco debe tener menos de 100 caracteres'),
  account_number: z
    .string()
    .min(4, 'El número de cuenta debe tener al menos 4 dígitos')
    .max(4, 'El número de cuenta debe tener exactamente 4 dígitos')
    .regex(/^\d+$/, 'El número de cuenta debe contener solo dígitos'),
  account_type: z.nativeEnum(BankAccountType, {
    errorMap: () => ({ message: 'El tipo de cuenta debe ser SAVINGS o CHECKING' }),
  }),
});

/**
 * Schema for cash details validation.
 */
const cashDetailsSchema = z.object({
  amount: z.number().min(0, 'El monto debe ser un número positivo'),
});

/**
 * Main schema for payment method creation with polymorphic details validation.
 * Uses superRefine to validate details based on the type field.
 */
export const createPaymentMethodSchema = z
  .object({
    name: z.string().min(1, 'El nombre es requerido').max(100, 'El nombre debe tener menos de 100 caracteres'),
    type: z.nativeEnum(PaymentMethodType, {
      errorMap: () => ({ message: 'El tipo debe ser CREDIT_CARD, BANK_ACCOUNT o CASH' }),
    }),
    currency: z.string().min(3, 'La moneda debe ser un código válido de 3 letras').max(3, 'La moneda debe ser un código válido de 3 letras'),
    details: z.any(), // Will be validated conditionally based on type
  })
  .superRefine((data, ctx) => {
    if (data.type === PaymentMethodType.CREDIT_CARD) {
      const result = creditCardDetailsSchema.safeParse(data.details);
      if (!result.success) {
        result.error.errors.forEach((err) => {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: err.message,
            path: ['details', ...err.path],
          });
        });
      }
    } else if (data.type === PaymentMethodType.BANK_ACCOUNT) {
      const result = bankAccountDetailsSchema.safeParse(data.details);
      if (!result.success) {
        result.error.errors.forEach((err) => {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: err.message,
            path: ['details', ...err.path],
          });
        });
      }
    } else if (data.type === PaymentMethodType.CASH) {
      const result = cashDetailsSchema.safeParse(data.details);
      if (!result.success) {
        result.error.errors.forEach((err) => {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: err.message,
            path: ['details', ...err.path],
          });
        });
      }
    }
  });

/**
 * Type inferred from the create payment method schema.
 */
export type CreatePaymentMethodDto = z.infer<typeof createPaymentMethodSchema>;

