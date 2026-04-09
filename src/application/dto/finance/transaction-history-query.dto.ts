import { z } from 'zod';
import { TransactionType } from 'fa-contracts';

export const transactionHistoryQuerySchema = z.object({
  startDate: z.string().date('Formato de fecha inválido, use YYYY-MM-DD').optional(),
  endDate: z.string().date('Formato de fecha inválido, use YYYY-MM-DD').optional(),
  type: z.nativeEnum(TransactionType, { message: 'Tipo de transacción inválido' }).optional(),
  categoryId: z.string().min(1).max(100).optional(),
  paymentMethodId: z.string().min(1).max(100).optional(),
  subtype: z.string().min(1).max(50).optional(),
  excludeCardPayments: z.enum(['true', 'false']).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50).optional(),
  offset: z.coerce.number().int().min(0).default(0).optional(),
});

export type TransactionHistoryQueryDto = z.infer<typeof transactionHistoryQuerySchema>;
