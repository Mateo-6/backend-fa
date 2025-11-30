import { z } from 'zod';
import { PaymentMethodType, BankAccountType } from '../../../domain/payment-method/types/payment-method.types';

/**
 * Schema for credit card details validation.
 */
const creditCardDetailsSchema = z.object({
  cut_off_day: z
    .number()
    .int()
    .min(1, 'Cut off day must be between 1 and 31')
    .max(31, 'Cut off day must be between 1 and 31'),
  payment_day: z
    .number()
    .int()
    .min(1, 'Payment day must be between 1 and 31')
    .max(31, 'Payment day must be between 1 and 31'),
  credit_limit: z.number().min(0, 'Credit limit must be a positive number'),
  current_balance: z.number().min(0, 'Current balance must be a positive number'),
});

/**
 * Schema for bank account details validation.
 */
const bankAccountDetailsSchema = z.object({
  bank_name: z.string().min(1, 'Bank name is required').max(100, 'Bank name must be less than 100 characters'),
  account_number: z
    .string()
    .min(4, 'Account number must have at least 4 digits')
    .max(4, 'Account number must have exactly 4 digits')
    .regex(/^\d+$/, 'Account number must contain only digits'),
  account_type: z.nativeEnum(BankAccountType, {
    errorMap: () => ({ message: 'Account type must be SAVINGS or CHECKING' }),
  }),
});

/**
 * Schema for cash details validation.
 */
const cashDetailsSchema = z.object({}).optional().default({});

/**
 * Main schema for payment method creation with polymorphic details validation.
 * Uses superRefine to validate details based on the type field.
 */
export const createPaymentMethodSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
    type: z.nativeEnum(PaymentMethodType, {
      errorMap: () => ({ message: 'Type must be CREDIT_CARD, BANK_ACCOUNT, or CASH' }),
    }),
    currency: z.string().min(3, 'Currency must be a valid 3-letter code').max(3, 'Currency must be a valid 3-letter code'),
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
      // Cash details are optional and default to empty object
      if (data.details === undefined || data.details === null) {
        data.details = {};
      }
    }
  });

/**
 * Type inferred from the create payment method schema.
 */
export type CreatePaymentMethodDto = z.infer<typeof createPaymentMethodSchema>;

