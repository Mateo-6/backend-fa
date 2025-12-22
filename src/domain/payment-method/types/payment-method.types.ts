/**
 * Re-export PaymentMethod interface and related types/enums from fa-contracts package.
 * This file maintains backward compatibility with existing imports.
 */
export type {
  PaymentMethod,
  CreditCardDetails,
  BankAccountDetails,
  CashDetails,
  PaymentMethodDetails,
} from 'fa-contracts';

export { PaymentMethodType, BankAccountType } from 'fa-contracts';

