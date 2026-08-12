import { Router } from 'express';
import { CreditCardController } from '../controllers/credit-card/credit-card.controller';
import { validate } from '../middleware/validation.middleware';
import { payCardSchema } from '../../../application/dto/credit-card/pay-card.dto';
import { asyncHandler } from '../middleware/async-handler.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { container } from '../../factories/service.factory';

const router = Router();

const creditCardController = new CreditCardController(container.creditCardService);

router.get('/', authMiddleware(container.tokenService), asyncHandler(creditCardController.getAllCards.bind(creditCardController)));
router.get('/:id', authMiddleware(container.tokenService), asyncHandler(creditCardController.getCardDetail.bind(creditCardController)));
router.get('/:id/statements', authMiddleware(container.tokenService), asyncHandler(creditCardController.getStatements.bind(creditCardController)));
router.get('/:id/statements/:periodStart', authMiddleware(container.tokenService), asyncHandler(creditCardController.getStatementDetail.bind(creditCardController)));
router.post('/:id/pay', authMiddleware(container.tokenService), validate(payCardSchema), asyncHandler(creditCardController.payCard.bind(creditCardController)));
router.get('/:id/payments', authMiddleware(container.tokenService), asyncHandler(creditCardController.getPaymentHistory.bind(creditCardController)));

export default router;
