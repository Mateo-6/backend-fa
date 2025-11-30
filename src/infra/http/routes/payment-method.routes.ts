import { Router } from 'express';
import { PaymentMethodController } from '../controllers/payment-method/payment-method.controller';
import { PaymentMethodService } from '../../../application/services/payment-method.service';
import { PaymentMethodMongooseRepository } from '../../repositories/payment-method-mongoose.repository';
import { UserMongooseRepository } from '../../repositories/user-mongoose.repository';
import { validate } from '../middleware/validation.middleware';
import { createPaymentMethodSchema } from '../../../application/dto/payment-method/create-payment-method.dto';
import { asyncHandler } from '../middleware/async-handler.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { JwtTokenService } from '../../services/jwt-token.service';

const router = Router();

// Dependency injection setup
const paymentMethodRepository = new PaymentMethodMongooseRepository();
const userRepository = new UserMongooseRepository();
const paymentMethodService = new PaymentMethodService(paymentMethodRepository, userRepository);
const paymentMethodController = new PaymentMethodController(paymentMethodService);
const tokenService = new JwtTokenService();

// All payment method routes are protected with authentication middleware
router.post(
  '/',
  authMiddleware(tokenService),
  validate(createPaymentMethodSchema),
  asyncHandler(paymentMethodController.create.bind(paymentMethodController))
);
router.get(
  '/',
  authMiddleware(tokenService),
  asyncHandler(paymentMethodController.getAll.bind(paymentMethodController))
);
router.get(
  '/:id/calculate-due-date',
  authMiddleware(tokenService),
  asyncHandler(paymentMethodController.calculatePaymentDueDate.bind(paymentMethodController))
);
router.delete(
  '/:id',
  authMiddleware(tokenService),
  asyncHandler(paymentMethodController.delete.bind(paymentMethodController))
);

export default router;

