import { PaymentMethod } from '../types/payment-method.types';

/**
 * Repository interface for payment method persistence operations.
 */
export interface PaymentMethodRepository {
  /**
   * Persists a new payment method.
   *
   * @param {PaymentMethod} paymentMethod Payment method data to persist.
   * @returns {Promise<PaymentMethod>} Stored payment method.
   */
  create(paymentMethod: PaymentMethod): Promise<PaymentMethod>;

  /**
   * Retrieves every payment method associated with the provided user.
   *
   * @param {string} userId Owner identifier.
   * @returns {Promise<PaymentMethod[]>} Collection of payment methods belonging to the user.
   */
  findAllByUser(userId: string): Promise<PaymentMethod[]>;

  /**
   * Finds a payment method by identifier.
   *
   * @param {string} id Payment method identifier.
   * @returns {Promise<PaymentMethod | null>} Matching payment method or null.
   */
  findById(id: string): Promise<PaymentMethod | null>;

  /**
   * Removes a payment method by identifier.
   *
   * @param {string} id Payment method identifier.
   * @returns {Promise<void>} Resolves once the payment method is deleted.
   */
  delete(id: string): Promise<void>;
}

