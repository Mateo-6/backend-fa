/**
 * Payment method types supported by the system.
 */
export enum PaymentMethodType {
  CREDIT_CARD = 'CREDIT_CARD',
  BANK_ACCOUNT = 'BANK_ACCOUNT',
  CASH = 'CASH',
}

/**
 * Bank account type enumeration.
 */
export enum BankAccountType {
  SAVINGS = 'SAVINGS',
  CHECKING = 'CHECKING',
}

/**
 * Credit card details structure.
 */
export interface CreditCardDetails {
  card_number: string; // Last 4 digits (required)
  cut_off_day: number; // 1-31: Day of the month when the statement closes
  payment_day: number; // 1-31: Payment due date
  credit_limit: number;
  current_balance: number;
}

/**
 * Bank account details structure.
 */
export interface BankAccountDetails {
  bank_name: string;
  account_number: string; // Last 4 digits (required)
  account_type: BankAccountType;
}

/**
 * Cash details structure.
 */
export interface CashDetails {
  amount: number; // Current cash amount (required)
}

/**
 * Union type for all payment method details.
 */
export type PaymentMethodDetails = CreditCardDetails | BankAccountDetails | CashDetails;

/**
 * Payment method domain entity.
 */
export interface PaymentMethod {
  id?: string;
  userId: string;
  name: string;
  type: PaymentMethodType;
  currency: string;
  details: PaymentMethodDetails;
  createdAt?: Date;
  updatedAt?: Date;
}

