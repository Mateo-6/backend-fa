import { PaymentMethodRepository } from '../../domain/payment-method/repositories/payment-method.repository';
import { PaymentMethod } from '../../domain/payment-method/types/payment-method.types';
import { PaymentMethodModel, IPaymentMethodDocument } from '../database/models/payment-method.model';
import { getMongooseInstance } from '../database/mongoose-client';
import { sessionContext } from '../database/session-context';

/**
 * Mongoose implementation of the PaymentMethodRepository interface.
 */
export class PaymentMethodMongooseRepository implements PaymentMethodRepository {
  /**
   * Persists a payment method document.
   *
   * @param {PaymentMethod} paymentMethod Payment method payload containing the owner reference.
   * @returns {Promise<PaymentMethod>} Created payment method mapped to the domain type.
   */
  async create(paymentMethod: PaymentMethod): Promise<PaymentMethod> {
    await getMongooseInstance();
    const createdPaymentMethod = await PaymentMethodModel.create({
      name: paymentMethod.name,
      type: paymentMethod.type,
      currency: paymentMethod.currency,
      details: paymentMethod.details,
      user: paymentMethod.userId,
    });
    return this.toDomain(createdPaymentMethod);
  }

  /**
   * Retrieves the payment methods that belong to the provided user.
   *
   * @param {string} userId Owner identifier.
   * @returns {Promise<PaymentMethod[]>} Payment methods tied to the user.
   */
  async findAllByUser(userId: string): Promise<PaymentMethod[]> {
    await getMongooseInstance();
    const paymentMethods = await PaymentMethodModel.find({ user: userId, deletedAt: null })
      .sort({ createdAt: -1 })
      .exec();
    return paymentMethods.map((paymentMethod) => this.toDomain(paymentMethod));
  }

  /**
   * Retrieves a single payment method by identifier.
   *
   * @param {string} id Payment method identifier.
   * @returns {Promise<PaymentMethod | null>} Matching payment method or null.
   */
  async findById(id: string): Promise<PaymentMethod | null> {
    await getMongooseInstance();
    const paymentMethod = await PaymentMethodModel.findOne({ _id: id, deletedAt: null }).exec();
    if (!paymentMethod) {
      return null;
    }
    return this.toDomain(paymentMethod);
  }

  /**
   * Updates an existing payment method.
   *
   * @param {string} id Payment method identifier.
   * @param {Partial<Omit<PaymentMethod, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>} updateData Partial payment method data to update.
   * @returns {Promise<PaymentMethod>} Updated payment method mapped to the domain type.
   */
  async update(id: string, updateData: Partial<Omit<PaymentMethod, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>): Promise<PaymentMethod> {
    await getMongooseInstance();
    const session = sessionContext.getStore();
    const updatedPaymentMethod = await PaymentMethodModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true, ...(session ? { session } : {}) },
    ).exec();

    if (!updatedPaymentMethod) {
      throw new Error(`Payment method with id ${id} not found`);
    }

    return this.toDomain(updatedPaymentMethod);
  }

  /**
   * Deletes a payment method by identifier.
   *
   * @param {string} id Payment method identifier.
   * @returns {Promise<void>} Resolves when the document is deleted.
   */
  async delete(id: string): Promise<void> {
    await getMongooseInstance();
    await PaymentMethodModel.updateOne({ _id: id }, { $set: { deletedAt: new Date() } }).exec();
  }

  /**
   * Maps a mongoose document to the domain type.
   *
   * @param {IPaymentMethodDocument} doc Mongoose document.
   * @returns {PaymentMethod} Domain payment method.
   */
  private toDomain(doc: IPaymentMethodDocument): PaymentMethod {
    return {
      id: doc.id,
      name: doc.name,
      type: doc.type,
      currency: doc.currency,
      details: doc.details as PaymentMethod['details'],
      userId: doc.user.toString(),
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      deletedAt: doc.deletedAt ?? null,
    };
  }
}

