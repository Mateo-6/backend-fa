import { Router } from 'express';
import { PaymentMethodController } from '../controllers/payment-method/payment-method.controller';
import { validate } from '../middleware/validation.middleware';
import { createPaymentMethodSchema } from '../../../application/dto/payment-method/create-payment-method.dto';
import { updatePaymentMethodSchema } from '../../../application/dto/payment-method/update-payment-method.dto';
import { toggleGmfExemptSchema } from '../../../application/dto/payment-method/toggle-gmf-exempt.dto';
import { asyncHandler } from '../middleware/async-handler.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { container } from '../../factories/service.factory';

const router = Router();

const paymentMethodController = new PaymentMethodController(container.paymentMethodService);

router.post('/', authMiddleware(container.tokenService), validate(createPaymentMethodSchema), asyncHandler(paymentMethodController.create.bind(paymentMethodController)));
router.get('/', authMiddleware(container.tokenService), asyncHandler(paymentMethodController.getAll.bind(paymentMethodController)));
router.patch('/:id/gmf-exempt', authMiddleware(container.tokenService), validate(toggleGmfExemptSchema), asyncHandler(paymentMethodController.toggleGmfExempt.bind(paymentMethodController)));
router.get('/:id/calculate-due-date', authMiddleware(container.tokenService), asyncHandler(paymentMethodController.calculatePaymentDueDate.bind(paymentMethodController)));
router.put('/:id', authMiddleware(container.tokenService), validate(updatePaymentMethodSchema), asyncHandler(paymentMethodController.update.bind(paymentMethodController)));
router.delete('/:id', authMiddleware(container.tokenService), asyncHandler(paymentMethodController.delete.bind(paymentMethodController)));

export default router;
