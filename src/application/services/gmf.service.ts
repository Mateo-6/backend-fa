import { TransactionRepository } from '../../domain/finance/repositories/transaction.repository';
import { PaymentMethodRepository } from '../../domain/payment-method/repositories/payment-method.repository';
import { PaymentMethodType, BankAccountDetails } from '../../domain/payment-method/types/payment-method.types';
import { TransactionType } from '../../domain/finance/types/transaction.types';

export interface GmfSummary {
  total_gmf: number;
  by_account: Array<{
    payment_method_id: string;
    name: string;
    gmf_amount: number;
  }>;
}

export class GmfService {
  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly paymentMethodRepository: PaymentMethodRepository
  ) {}

  async getSummary(userId: string, month: number, year: number): Promise<GmfSummary> {
    const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const { items: transactions } = await this.transactionRepository.findAllByUser(userId, {
      startDate,
      endDate,
      type: TransactionType.EXPENSE,
    });

    const paymentMethods = await this.paymentMethodRepository.findAllByUser(userId);
    const pmMap = new Map(paymentMethods.map(pm => [pm.id, pm]));

    const byAccountMap = new Map<string, { name: string; gmf_amount: number }>();
    let totalGmf = 0;

    for (const tx of transactions) {
      if (!tx.paymentMethodId) continue;
      const pm = pmMap.get(tx.paymentMethodId);
      if (!pm || pm.type !== PaymentMethodType.BANK_ACCOUNT) continue;

      const details = pm.details as BankAccountDetails;
      if (details.is_gmf_exempt) continue;

      const gmf = Math.round(tx.amount * 0.004);
      totalGmf += gmf;

      const existing = byAccountMap.get(pm.id!);
      if (existing) {
        existing.gmf_amount += gmf;
      } else {
        byAccountMap.set(pm.id!, { name: pm.name, gmf_amount: gmf });
      }
    }

    return {
      total_gmf: totalGmf,
      by_account: Array.from(byAccountMap.entries()).map(([id, data]) => ({
        payment_method_id: id,
        ...data,
      })),
    };
  }
}
