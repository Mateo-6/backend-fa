import { Router } from 'express';
import { GmfController } from '../controllers/gmf/gmf.controller';
import { GmfService } from '../../../application/services/gmf.service';
import { TransactionMongooseRepository } from '../../repositories/transaction-mongoose.repository';
import { PaymentMethodMongooseRepository } from '../../repositories/payment-method-mongoose.repository';
import { asyncHandler } from '../middleware/async-handler.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { JwtTokenService } from '../../services/jwt-token.service';

const router = Router();

const transactionRepository = new TransactionMongooseRepository();
const paymentMethodRepository = new PaymentMethodMongooseRepository();
const gmfService = new GmfService(transactionRepository, paymentMethodRepository);
const gmfController = new GmfController(gmfService);
const tokenService = new JwtTokenService();

router.get(
  '/summary',
  authMiddleware(tokenService),
  asyncHandler(gmfController.getSummary.bind(gmfController))
);

export default router;
