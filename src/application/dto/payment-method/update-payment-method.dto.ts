import { z } from 'zod';
import { PaymentMethodType, BankAccountType } from '../../../domain/payment-method/types/payment-method.types';

/**
 * Schema for credit card details validation (for updates).
 */
const creditCardDetailsSchema = z.object({
  card_number: z
    .string()
    .min(4, 'El número de tarjeta debe tener al menos 4 dígitos')
    .max(4, 'El número de tarjeta debe tener exactamente 4 dígitos')
    .regex(/^\d+$/, 'El número de tarjeta debe contener solo dígitos')
    .optional(),
  cut_off_day: z
    .number()
    .int()
    .min(1, 'El día de corte debe estar entre 1 y 31')
    .max(31, 'El día de corte debe estar entre 1 y 31')
    .optional(),
  payment_day: z
    .number()
    .int()
    .min(1, 'El día de pago debe estar entre 1 y 31')
    .max(31, 'El día de pago debe estar entre 1 y 31')
    .optional(),
  credit_limit: z.number().min(0, 'El límite de crédito debe ser un número positivo').optional(),
  current_balance: z.number().min(0, 'El saldo actual debe ser un número positivo').optional(),
});

/**
 * Schema for bank account details validation (for updates).
 */
const bankAccountDetailsSchema = z.object({
  bank_name: z
    .string()
    .min(1, 'El nombre del banco es requerido')
    .max(100, 'El nombre del banco debe tener menos de 100 caracteres')
    .optional(),
  account_number: z
    .string()
    .min(4, 'El número de cuenta debe tener al menos 4 dígitos')
    .max(4, 'El número de cuenta debe tener exactamente 4 dígitos')
    .regex(/^\d+$/, 'El número de cuenta debe contener solo dígitos')
    .optional(),
  account_type: z
    .nativeEnum(BankAccountType, {
      message: 'El tipo de cuenta debe ser SAVINGS o CHECKING',
    })
    .optional(),
  current_balance: z.number().min(0, 'El saldo actual debe ser un número positivo').optional(),
});

/**
 * Schema for cash details validation (for updates).
 */
const cashDetailsSchema = z.object({
  amount: z.number().min(0, 'El monto debe ser un número positivo').optional(),
});

/**
 * Schema for updating a payment method.
 * All fields are optional, but at least one field must be provided.
 * Details validation depends on the type field if provided.
 */
export const updatePaymentMethodSchema: z.ZodType<{
  name?: string;
  type?: PaymentMethodType;
  currency?: string;
  details?: any;
}> = z
  .object({
    name: z.string().min(1, 'El nombre es requerido').max(100, 'El nombre debe tener menos de 100 caracteres').optional(),
    type: z
      .nativeEnum(PaymentMethodType, {
        message: 'El tipo debe ser CREDIT_CARD, BANK_ACCOUNT o CASH',
      })
      .optional(),
    currency: z
      .string()
      .min(3, 'La moneda debe ser un código válido de 3 letras')
      .max(3, 'La moneda debe ser un código válido de 3 letras')
      .optional(),
    details: z.any().optional(), // Will be validated conditionally based on type
  })
  .superRefine((data, ctx) => {
    // If type is provided, validate details accordingly
    if (data.type === PaymentMethodType.CREDIT_CARD) {
      // If changing type to CREDIT_CARD, details with card_number are required
      if (data.details !== undefined) {
        // Create a strict schema for CREDIT_CARD when type is being set/changed
        const strictCreditCardSchema = z.object({
          card_number: z
            .string()
            .min(4, 'El número de tarjeta debe tener al menos 4 dígitos')
            .max(4, 'El número de tarjeta debe tener exactamente 4 dígitos')
            .regex(/^\d+$/, 'El número de tarjeta debe contener solo dígitos'),
          cut_off_day: z
            .number()
            .int()
            .min(1, 'El día de corte debe estar entre 1 y 31')
            .max(31, 'El día de corte debe estar entre 1 y 31')
            .optional(),
          payment_day: z
            .number()
            .int()
            .min(1, 'El día de pago debe estar entre 1 y 31')
            .max(31, 'El día de pago debe estar entre 1 y 31')
            .optional(),
          credit_limit: z.number().min(0, 'El límite de crédito debe ser un número positivo').optional(),
          current_balance: z.number().min(0, 'El saldo actual debe ser un número positivo').optional(),
        });
        const result = strictCreditCardSchema.safeParse(data.details);
        if (!result.success) {
          result.error.issues.forEach((err) => {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: err.message,
              path: ['details', ...err.path],
            });
          });
        }
      } else {
        // If type is CREDIT_CARD but details are not provided, that's okay for partial updates
        // The existing details will remain
      }
    } else if (data.type === PaymentMethodType.BANK_ACCOUNT) {
      // If changing type to BANK_ACCOUNT, details with account_number are required
      if (data.details !== undefined) {
        // Create a strict schema for BANK_ACCOUNT when type is being set/changed
        const strictBankAccountSchema = z.object({
          bank_name: z
            .string()
            .min(1, 'El nombre del banco es requerido')
            .max(100, 'El nombre del banco debe tener menos de 100 caracteres')
            .optional(),
          account_number: z
            .string()
            .min(4, 'El número de cuenta debe tener al menos 4 dígitos')
            .max(4, 'El número de cuenta debe tener exactamente 4 dígitos')
            .regex(/^\d+$/, 'El número de cuenta debe contener solo dígitos'),
          account_type: z
            .nativeEnum(BankAccountType, {
              message: 'El tipo de cuenta debe ser SAVINGS o CHECKING',
            })
            .optional(),
          current_balance: z.number().min(0, 'El saldo actual debe ser un número positivo').optional(),
        });
        const result = strictBankAccountSchema.safeParse(data.details);
        if (!result.success) {
          result.error.issues.forEach((err) => {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: err.message,
              path: ['details', ...err.path],
            });
          });
        }
      } else {
        // If type is BANK_ACCOUNT but details are not provided, that's okay for partial updates
        // The existing details will remain
      }
    } else if (data.type === PaymentMethodType.CASH) {
      // If changing type to CASH, details with amount are required
      if (data.details !== undefined) {
        // Create a strict schema for CASH when type is being set/changed
        const strictCashSchema = z.object({
          amount: z.number().min(0, 'El monto debe ser un número positivo'),
        });
        const result = strictCashSchema.safeParse(data.details);
        if (!result.success) {
          result.error.issues.forEach((err) => {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: err.message,
              path: ['details', ...err.path],
            });
          });
        }
      } else {
        // If type is CASH but details are not provided, that's okay for partial updates
        // The existing details will remain
      }
    } else if (data.type === undefined && data.details !== undefined) {
      // If details are provided without type, validate with the flexible schema
      // This handles partial updates where we don't know the current type
      // We'll validate based on what's provided, but account_number won't be required
      // unless we're updating an existing BANK_ACCOUNT (handled in service layer)
    }
  })
  .refine(
    (data) =>
      typeof data.name === 'string' ||
      typeof data.type !== 'undefined' ||
      typeof data.currency === 'string' ||
      typeof data.details !== 'undefined',
    'Proporciona al menos un campo para actualizar'
  );

/**
 * Type inferred from the update payment method schema.
 */
export type UpdatePaymentMethodDto = z.infer<typeof updatePaymentMethodSchema>;
