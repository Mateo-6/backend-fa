import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard/dashboard.controller';
import { DashboardService } from '../../../application/services/dashboard.service';
import { CreditCardService } from '../../../application/services/credit-card.service';
import { TransactionMongooseRepository } from '../../repositories/transaction-mongoose.repository';
import { RecurringExpenseMongooseRepository } from '../../repositories/recurring-expense-mongoose.repository';
import { PaymentMethodMongooseRepository } from '../../repositories/payment-method-mongoose.repository';
import { asyncHandler } from '../middleware/async-handler.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { JwtTokenService } from '../../services/jwt-token.service';

const router = Router();

// Dependency injection setup
const transactionRepository = new TransactionMongooseRepository();
const recurringExpenseRepository = new RecurringExpenseMongooseRepository();
const paymentMethodRepository = new PaymentMethodMongooseRepository();
const creditCardService = new CreditCardService(paymentMethodRepository, transactionRepository);
const dashboardService = new DashboardService(transactionRepository, recurringExpenseRepository, creditCardService, paymentMethodRepository);
const dashboardController = new DashboardController(dashboardService);
const tokenService = new JwtTokenService();

// Dashboard route is protected with authentication middleware
router.get(
  '/',
  authMiddleware(tokenService),
  asyncHandler(dashboardController.getDashboard.bind(dashboardController))
);

export default router;

