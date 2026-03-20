import { Router } from 'express';
import { CreditCardController } from '../controllers/credit-card/credit-card.controller';
import { CreditCardService } from '../../../application/services/credit-card.service';
import { PaymentMethodMongooseRepository } from '../../repositories/payment-method-mongoose.repository';
import { TransactionMongooseRepository } from '../../repositories/transaction-mongoose.repository';
import { validate } from '../middleware/validation.middleware';
import { payCardSchema } from '../../../application/dto/credit-card/pay-card.dto';
import { asyncHandler } from '../middleware/async-handler.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { JwtTokenService } from '../../services/jwt-token.service';

const router = Router();

// Dependency injection setup
const paymentMethodRepository = new PaymentMethodMongooseRepository();
const transactionRepository = new TransactionMongooseRepository();
const creditCardService = new CreditCardService(paymentMethodRepository, transactionRepository);
const creditCardController = new CreditCardController(creditCardService);
const tokenService = new JwtTokenService();

// All credit card routes are protected
router.get(
  '/',
  authMiddleware(tokenService),
  asyncHandler(creditCardController.getAllCards.bind(creditCardController))
);
router.get(
  '/:id',
  authMiddleware(tokenService),
  asyncHandler(creditCardController.getCardDetail.bind(creditCardController))
);
router.get(
  '/:id/statements',
  authMiddleware(tokenService),
  asyncHandler(creditCardController.getStatements.bind(creditCardController))
);
router.get(
  '/:id/statements/:periodStart',
  authMiddleware(tokenService),
  asyncHandler(creditCardController.getStatementDetail.bind(creditCardController))
);
router.post(
  '/:id/pay',
  authMiddleware(tokenService),
  validate(payCardSchema),
  asyncHandler(creditCardController.payCard.bind(creditCardController))
);
router.get(
  '/:id/payments',
  authMiddleware(tokenService),
  asyncHandler(creditCardController.getPaymentHistory.bind(creditCardController))
);

export default router;
