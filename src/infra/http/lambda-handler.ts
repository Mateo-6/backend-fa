import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { Request, Response } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { env } from '../config/env';

// Dependency Injection - Initialize outside handler for warm start
import { HealthController } from './controllers/health.controller';
import { HealthService } from '../../domain/health/services/health-service';

import { AuthController } from './controllers/auth/auth.controller';
import { AuthService } from '../../application/services/auth.service';
import { UserMongooseRepository } from '../repositories/user-mongoose.repository';
import { JwtTokenService } from '../services/jwt-token.service';
import { BcryptPasswordService } from '../services/bcrypt-password.service';
import { RefreshTokenMongooseRepository } from '../repositories/refresh-token-mongoose.repository';

import { UserController } from './controllers/user/user.controller';
import { UserService } from '../../application/services/user.service';

import { CategoryController } from './controllers/category/category.controller';
import { CategoryService } from '../../application/services/category.service';
import { CategoryMongooseRepository } from '../repositories/category-mongoose.repository';

import { TransactionController } from './controllers/finance/transaction.controller';
import { TransactionService } from '../../application/services/transaction.service';
import { TransactionMongooseRepository } from '../repositories/transaction-mongoose.repository';
import { RecurringExpenseMongooseRepository } from '../repositories/recurring-expense-mongoose.repository';
import { PaymentMethodMongooseRepository } from '../repositories/payment-method-mongoose.repository';

import { RecurringExpenseController } from './controllers/finance/recurring-expense.controller';
import { RecurringExpenseService } from '../../application/services/recurring-expense.service';

import { PaymentMethodController } from './controllers/payment-method/payment-method.controller';
import { PaymentMethodService } from '../../application/services/payment-method.service';

import { DashboardController } from './controllers/dashboard/dashboard.controller';
import { DashboardService } from '../../application/services/dashboard.service';
import { CreditCardService } from '../../application/services/credit-card.service';
import { CreditCardController } from './controllers/credit-card/credit-card.controller';

import { NotificationController } from './controllers/notification/notification.controller';
import { NotificationService } from '../../application/services/notification.service';
import { NotificationMongooseRepository } from '../repositories/notification-mongoose.repository';

import { BudgetController } from './controllers/budget/budget.controller';
import { BudgetService } from '../../application/services/budget.service';
import { BudgetMongooseRepository } from '../repositories/budget-mongoose.repository';

import { GmfController } from './controllers/gmf/gmf.controller';
import { GmfService } from '../../application/services/gmf.service';

import { AmiService } from '../../application/services/ami.service';
import { OpenAiParserService } from '../services/openai-parser.service';
import { redisCacheService } from '../services/redis-cache.service';

import { AppError, UnauthorizedError } from '../../domain/errors/app-error';
import { AuthenticatedRequest } from './types/request.types';
import { SuccessResponse, ErrorResponse } from './types/response.types';

// Validation schemas
import { loginSchema } from '../../application/dto/auth/login.dto';
import { createUserSchema } from '../../application/dto/user/create-user.dto';
import { updateUserSchema } from '../../application/dto/user/update-user.dto';
import { createCategorySchema } from '../../application/dto/category/create-category.dto';
import { updateCategorySchema } from '../../application/dto/category/update-category.dto';
import { createTransactionSchema } from '../../application/dto/finance/create-transaction.dto';
import { updateTransactionSchema } from '../../application/dto/finance/update-transaction.dto';
import { createRecurringSchema } from '../../application/dto/finance/create-recurring.dto';
import { createPaymentMethodSchema } from '../../application/dto/payment-method/create-payment-method.dto';
import { updatePaymentMethodSchema } from '../../application/dto/payment-method/update-payment-method.dto';
import { registerPushTokenSchema } from '../../application/dto/notification/register-push-token.dto';
import { createBudgetSchema } from '../../application/dto/budget/create-budget.dto';
import { updateBudgetSchema } from '../../application/dto/budget/update-budget.dto';
import { toggleGmfExemptSchema } from '../../application/dto/payment-method/toggle-gmf-exempt.dto';
import { ParseIntentRequestSchema } from '../../application/dto/finance/parse-intent.dto';
import { MongooseClientSingleton } from '../database/mongoose-client';

// Initialize MongoDB connection outside handler (warm start optimization)
// Connection will be reused across Lambda invocations
let mongoConnectionInitialized = false;

/**
 * Initializes MongoDB connection if not already connected
 * This runs once per Lambda container instance (warm start)
 *
 * @returns {Promise<void>} Resolves when connection is established
 */
async function ensureMongoConnection(): Promise<void> {
  if (!mongoConnectionInitialized) {
    try {
      await MongooseClientSingleton.connect();
      mongoConnectionInitialized = true;
    } catch (error) {
      console.error('Failed to initialize MongoDB connection:', error);
      // Don't throw here - let individual requests handle connection errors
    }
  }
}

// Initialize all dependencies outside handler (warm start optimization)
const userRepository = new UserMongooseRepository();
const tokenService = new JwtTokenService();
const passwordService = new BcryptPasswordService();
const refreshTokenRepository = new RefreshTokenMongooseRepository();

// Services
const authService = new AuthService(userRepository, tokenService, passwordService, refreshTokenRepository);
const categoryRepository = new CategoryMongooseRepository();
const userService = new UserService(userRepository, passwordService, categoryRepository);
const categoryService = new CategoryService(categoryRepository, userRepository, redisCacheService);
const transactionRepository = new TransactionMongooseRepository();
const recurringExpenseRepository = new RecurringExpenseMongooseRepository();
const paymentMethodRepository = new PaymentMethodMongooseRepository();
const paymentMethodService = new PaymentMethodService(paymentMethodRepository, userRepository, redisCacheService);
const transactionService = new TransactionService(
  transactionRepository,
  recurringExpenseRepository,
  categoryRepository,
  userRepository,
  paymentMethodRepository,
  paymentMethodService
);
const recurringExpenseService = new RecurringExpenseService(
  recurringExpenseRepository,
  userRepository,
  paymentMethodRepository
);
const creditCardService = new CreditCardService(paymentMethodRepository, transactionRepository);
const dashboardService = new DashboardService(transactionRepository, recurringExpenseRepository, creditCardService, paymentMethodRepository);
const notificationRepository = new NotificationMongooseRepository();
const notificationService = new NotificationService(userRepository, notificationRepository);
const budgetRepository = new BudgetMongooseRepository();
const budgetService = new BudgetService(budgetRepository, transactionRepository, notificationRepository, userRepository);
const gmfService = new GmfService(transactionRepository, paymentMethodRepository);
const openAiParser = new OpenAiParserService();
const amiService = new AmiService(openAiParser, categoryService, paymentMethodService, redisCacheService);
const healthService = new HealthService();

// Controllers
const healthController = new HealthController(healthService);
const authController = new AuthController(authService);
const userController = new UserController(userService);
const categoryController = new CategoryController(categoryService);
const transactionController = new TransactionController(transactionService, amiService);
const recurringExpenseController = new RecurringExpenseController(recurringExpenseService);
const paymentMethodController = new PaymentMethodController(paymentMethodService);
const dashboardController = new DashboardController(dashboardService);
const notificationController = new NotificationController(notificationService);
const creditCardController = new CreditCardController(creditCardService);
const budgetController = new BudgetController(budgetService);
const gmfController = new GmfController(gmfService);

/**
 * Type for route handler function
 */
type RouteHandler = (req: Request, res: Response) => Promise<void>;

/**
 * Type for route configuration
 */
interface RouteConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  handler: RouteHandler;
  authRequired?: boolean;
  validateSchema?: ZodSchema;
}

/**
 * Creates an Express-like Request object from Lambda event
 *
 * @param {APIGatewayProxyEvent} event Lambda API Gateway event
 * @returns {Request} Express-like Request object
 */
/**
 * Creates an Express-like Request object from Lambda event
 *
 * @param {APIGatewayProxyEvent} event Lambda API Gateway event
 * @returns {Request} Express-like Request object
 */
function createRequest(event: APIGatewayProxyEvent): Request {
  // For HTTP API v2, use rawPath if available
  const rawPath = (event as any).rawPath || event.path || '';
  const path = rawPath.split('?')[0]; // Remove query string
  const queryParams = event.queryStringParameters || {};
  const pathParams = event.pathParameters || {};
  const headers = event.headers || {};
  let rawBody = event.body || '';
  if (rawBody && event.isBase64Encoded) {
    rawBody = Buffer.from(rawBody, 'base64').toString('utf-8');
  }
  const body = rawBody ? JSON.parse(rawBody) : {};

  // Match path parameters (filter out undefined values)
  const params: Record<string, string> = {};
  if (pathParams) {
    Object.entries(pathParams).forEach(([key, value]) => {
      if (value !== undefined) {
        params[key] = value;
      }
    });
  }
  
  // For HTTP API v2, method is in requestContext.http.method
  const eventV2 = event as any;
  const method = eventV2.requestContext?.http?.method || event.httpMethod || 'GET';
  
  return {
    method,
    path,
    url: path,
    params,
    query: queryParams,
    headers: headers as any,
    body,
  } as any as Request;
}

/**
 * Creates an Express-like Response object that captures the response data
 *
 * @returns {Response & { capturedData?: SuccessResponse | ErrorResponse; capturedStatus?: number }} Express-like Response object
 */
function createResponse(): Response & { capturedData?: SuccessResponse | ErrorResponse; capturedStatus?: number } {
  const res: any = {
    capturedData: undefined,
    capturedStatus: 200,
    status: function(code: number) {
      this.capturedStatus = code;
      return this;
    },
    json: function(data: any) {
      // Handle both standardized responses and plain data
      if (data && typeof data === 'object' && 'status' in data && 'code' in data) {
        this.capturedData = data;
      } else {
        this.capturedData = {
          status: true,
          code: this.capturedStatus,
          data,
        } as SuccessResponse;
      }
      return this;
    },
  };

  return res;
}

/**
 * Extracts authentication token from request headers
 *
 * @param {Request} req Express-like Request object
 * @returns {string | null} JWT token or null if not found
 */
function extractToken(req: Request): string | null {
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  if (!authHeader) {
    return null;
  }

  const parts = typeof authHeader === 'string' ? authHeader.split(' ') : [];
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Authenticates a request and attaches user info to request object
 *
 * @param {Request} req Express-like Request object
 * @returns {Promise<void>} Resolves if authentication succeeds, throws if it fails
 */
async function authenticateRequest(req: Request): Promise<void> {
  const token = extractToken(req);
  
  if (!token) {
    throw new UnauthorizedError('Se requiere el encabezado de autorización');
  }

  try {
    const decoded = tokenService.verify(token) as { id: string };
    
    if (!decoded.id) {
      throw new UnauthorizedError('Carga útil del token inválida');
    }

    // Attach user info to request
    (req as AuthenticatedRequest).user = {
      id: decoded.id,
    };
  } catch (error) {
    throw new UnauthorizedError('Token inválido o expirado');
  }
}

/**
 * Validates request body against a Zod schema
 *
 * @param {Request} req Express-like Request object
 * @param {ZodSchema} schema Zod validation schema
 * @returns {void} Throws ValidationError if validation fails
 */
function validateRequest(req: Request, schema: ZodSchema): void {
  const validationResult = schema.safeParse(req.body);

  if (!validationResult.success) {
    const errorMessages = validationResult.error.issues.map(
      (err) => `${err.path.join('.')}: ${err.message}`
    ).join(', ');
    throw new AppError(`Error de validación: ${errorMessages}`, 400);
  }

  // Replace body with validated data
  req.body = validationResult.data;
}

/**
 * Matches a request path against a route pattern and extracts parameters
 *
 * @param {string} pattern Route pattern (e.g., '/users/:id')
 * @param {string} path Actual request path (e.g., '/users/123')
 * @returns {{ match: boolean; params: Record<string, string> }} Match result and extracted parameters
 */
function matchRoute(pattern: string, path: string): { match: boolean; params: Record<string, string> } {
  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = path.split('/').filter(Boolean);

  if (patternParts.length !== pathParts.length) {
    return { match: false, params: {} };
  }

  const params: Record<string, string> = {};
  let match = true;

  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i];
    const pathPart = pathParts[i];

    if (patternPart.startsWith(':')) {
      // Extract parameter
      const paramName = patternPart.slice(1);
      params[paramName] = pathPart;
    } else if (patternPart !== pathPart) {
      match = false;
      break;
    }
  }

  return { match, params };
}

/**
 * Routes configuration - maps HTTP method and path to handlers
 */
const routes: RouteConfig[] = [
  // Health check (no auth required)
  { method: 'GET', path: '/health', handler: async (req: Request, res: Response) => healthController.getHealth(req, res) },

  // Auth routes (no auth required)
  { method: 'POST', path: '/auth/login', handler: authController.login.bind(authController), validateSchema: loginSchema },
  { method: 'POST', path: '/auth/logout', handler: authController.logout.bind(authController), authRequired: true },

  // User routes
  { method: 'POST', path: '/users', handler: userController.create.bind(userController), validateSchema: createUserSchema },
  { method: 'GET', path: '/users', handler: userController.getAll.bind(userController) },
  { method: 'GET', path: '/users/:id', handler: userController.getById.bind(userController) },
  { method: 'PUT', path: '/users/:id', handler: userController.update.bind(userController), validateSchema: updateUserSchema },
  { method: 'DELETE', path: '/users/:id', handler: userController.delete.bind(userController) },

  // Category routes (all require auth)
  { method: 'POST', path: '/categories', handler: categoryController.create.bind(categoryController), authRequired: true, validateSchema: createCategorySchema },
  { method: 'GET', path: '/categories', handler: categoryController.getAll.bind(categoryController), authRequired: true },
  { method: 'GET', path: '/categories/:id', handler: categoryController.getById.bind(categoryController), authRequired: true },
  { method: 'PUT', path: '/categories/:id', handler: categoryController.update.bind(categoryController), authRequired: true, validateSchema: updateCategorySchema },
  { method: 'DELETE', path: '/categories/:id', handler: categoryController.delete.bind(categoryController), authRequired: true },

  // Transaction routes (all require auth)
  // parse-intent MUST be listed before /:id to avoid parameter capture
  { method: 'POST', path: '/transactions/parse-intent', handler: transactionController.parseIntent.bind(transactionController), authRequired: true, validateSchema: ParseIntentRequestSchema },
  { method: 'POST', path: '/transactions/manual', handler: transactionController.createManual.bind(transactionController), authRequired: true, validateSchema: createTransactionSchema },
  { method: 'POST', path: '/transactions/recurring/:recurringExpenseId', handler: transactionController.processRecurringPayment.bind(transactionController), authRequired: true },
  { method: 'GET', path: '/transactions/history', handler: transactionController.getHistory.bind(transactionController), authRequired: true },
  { method: 'PUT', path: '/transactions/:id', handler: transactionController.update.bind(transactionController), authRequired: true, validateSchema: updateTransactionSchema },
  { method: 'DELETE', path: '/transactions/:id', handler: transactionController.delete.bind(transactionController), authRequired: true },

  // Recurring expense routes (all require auth)
  { method: 'POST', path: '/recurring-expenses', handler: recurringExpenseController.create.bind(recurringExpenseController), authRequired: true, validateSchema: createRecurringSchema },
  { method: 'GET', path: '/recurring-expenses', handler: recurringExpenseController.getAll.bind(recurringExpenseController), authRequired: true },
  { method: 'PUT', path: '/recurring-expenses/:id', handler: recurringExpenseController.update.bind(recurringExpenseController), authRequired: true },
  { method: 'DELETE', path: '/recurring-expenses/:id', handler: recurringExpenseController.delete.bind(recurringExpenseController), authRequired: true },

  // Payment method routes (all require auth)
  { method: 'POST', path: '/payment-methods', handler: paymentMethodController.create.bind(paymentMethodController), authRequired: true, validateSchema: createPaymentMethodSchema },
  { method: 'GET', path: '/payment-methods', handler: paymentMethodController.getAll.bind(paymentMethodController), authRequired: true },
  { method: 'PATCH', path: '/payment-methods/:id/gmf-exempt', handler: paymentMethodController.toggleGmfExempt.bind(paymentMethodController), authRequired: true, validateSchema: toggleGmfExemptSchema },
  { method: 'GET', path: '/payment-methods/:id/calculate-due-date', handler: paymentMethodController.calculatePaymentDueDate.bind(paymentMethodController), authRequired: true },
  { method: 'PUT', path: '/payment-methods/:id', handler: paymentMethodController.update.bind(paymentMethodController), authRequired: true, validateSchema: updatePaymentMethodSchema },
  { method: 'DELETE', path: '/payment-methods/:id', handler: paymentMethodController.delete.bind(paymentMethodController), authRequired: true },

  // Dashboard routes (all require auth)
  { method: 'GET', path: '/dashboard', handler: dashboardController.getDashboard.bind(dashboardController), authRequired: true },

  // Notification routes (all require auth)
  { method: 'POST', path: '/notifications/register-token', handler: notificationController.registerToken.bind(notificationController), authRequired: true, validateSchema: registerPushTokenSchema },
  { method: 'GET', path: '/notifications', handler: notificationController.getNotifications.bind(notificationController), authRequired: true },
  { method: 'PATCH', path: '/notifications/:id/read', handler: notificationController.markAsRead.bind(notificationController), authRequired: true },
  { method: 'GET', path: '/notifications/unread-count', handler: notificationController.getUnreadCount.bind(notificationController), authRequired: true },

  // Credit card routes (all require auth)
  { method: 'GET', path: '/credit-cards', handler: creditCardController.getAllCards.bind(creditCardController), authRequired: true },
  { method: 'GET', path: '/credit-cards/:id', handler: creditCardController.getCardDetail.bind(creditCardController), authRequired: true },
  { method: 'GET', path: '/credit-cards/:id/statements', handler: creditCardController.getStatements.bind(creditCardController), authRequired: true },
  { method: 'GET', path: '/credit-cards/:id/statements/:periodStart', handler: creditCardController.getStatementDetail.bind(creditCardController), authRequired: true },
  { method: 'POST', path: '/credit-cards/:id/pay', handler: creditCardController.payCard.bind(creditCardController), authRequired: true },
  { method: 'GET', path: '/credit-cards/:id/payments', handler: creditCardController.getPaymentHistory.bind(creditCardController), authRequired: true },

  // GMF routes (all require auth)
  { method: 'GET', path: '/gmf/summary', handler: gmfController.getSummary.bind(gmfController), authRequired: true },

  // Budget routes — /summary and /history BEFORE /:id to avoid conflicts
  { method: 'POST', path: '/budgets', handler: budgetController.create.bind(budgetController), authRequired: true, validateSchema: createBudgetSchema },
  { method: 'GET', path: '/budgets', handler: budgetController.getAll.bind(budgetController), authRequired: true },
  { method: 'GET', path: '/budgets/summary', handler: budgetController.getSummary.bind(budgetController), authRequired: true },
  { method: 'GET', path: '/budgets/history', handler: budgetController.getHistory.bind(budgetController), authRequired: true },
  { method: 'GET', path: '/budgets/:id', handler: budgetController.getById.bind(budgetController), authRequired: true },
  { method: 'PUT', path: '/budgets/:id', handler: budgetController.update.bind(budgetController), authRequired: true, validateSchema: updateBudgetSchema },
  { method: 'PATCH', path: '/budgets/:id/recalculate', handler: budgetController.recalculate.bind(budgetController), authRequired: true },
  { method: 'PATCH', path: '/budgets/:id/finalize', handler: budgetController.finalize.bind(budgetController), authRequired: true },
  { method: 'DELETE', path: '/budgets/:id', handler: budgetController.permanentDelete.bind(budgetController), authRequired: true },
];

/**
 * Finds a matching route for the given method and path
 *
 * @param {string} method HTTP method
 * @param {string} path Request path
 * @returns {RouteConfig | null} Matching route configuration or null
 */
function findRoute(method: string, path: string): RouteConfig | null {
  // Remove leading slash if present for consistency
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  for (const route of routes) {
    if (route.method !== method) {
      continue;
    }

    const { match, params } = matchRoute(route.path, normalizedPath);
    if (match) {
      // Return route with matched params
      return { ...route, matchedParams: params } as RouteConfig & { matchedParams: Record<string, string> };
    }
  }

  return null;
}

/**
 * Gets the CORS headers for API Gateway responses
 *
 * @returns {Record<string, string>} CORS headers object
 */
function getCorsHeaders(origin?: string): Record<string, string> {
  const allowedOrigins = env.CORS_ORIGIN.split(',').map(o => o.trim());
  const resolvedOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  return {
    'Access-Control-Allow-Origin': resolvedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '3600',
  };
}

/**
 * Transforms application response to API Gateway format
 *
 * @param {SuccessResponse | ErrorResponse} response Application response
 * @param {number} statusCode HTTP status code
 * @returns {APIGatewayProxyResult} API Gateway formatted response
 */
function createApiGatewayResponse(
  response: SuccessResponse | ErrorResponse | null,
  statusCode: number,
  origin?: string
): APIGatewayProxyResult {
  const defaultResponse: SuccessResponse = {
    status: true,
    code: statusCode,
    data: null,
  };

  const finalResponse = response || defaultResponse;

  return {
    statusCode: finalResponse.code || statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...getCorsHeaders(origin),
    },
    body: JSON.stringify(finalResponse),
  };
}

/**
 * Main Lambda handler function
 *
 * @param {APIGatewayProxyEvent} event API Gateway proxy event
 * @param {Context} context Lambda execution context
 * @returns {Promise<APIGatewayProxyResult>} API Gateway formatted response
 */
/**
 * Main Lambda handler function
 *
 * @param {APIGatewayProxyEvent} event API Gateway proxy event
 * @param {Context} context Lambda execution context
 * @returns {Promise<APIGatewayProxyResult>} API Gateway formatted response
 */
export async function handler(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  // Extract origin before try/catch so it's available in the catch block for CORS headers
  const origin = event.headers?.['origin'] || event.headers?.['Origin'];

  try {
    // Extract method and path from event
    // For HTTP API v2, method is in requestContext.http.method, rawPath is available
    // For REST API v1, method is in httpMethod, path is in path
    const eventV2 = event as any;
    const method = eventV2.requestContext?.http?.method || event.httpMethod || 'GET';
    let rawPath = eventV2.rawPath || event.path || '/';

    // Handle stage path (e.g., /$default/health -> /health)
    // When using {proxy+}, the stage is included in the path
    const stage = eventV2.requestContext?.stage || '$default';
    if (rawPath.startsWith(`/${stage}/`)) {
      rawPath = rawPath.replace(`/${stage}`, '');
    } else if (rawPath === `/${stage}`) {
      rawPath = '/';
    }

    // Remove query string if present in rawPath
    const path = rawPath.split('?')[0];

    // Handle OPTIONS requests (CORS preflight)
    if (method === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: getCorsHeaders(origin),
        body: '',
      };
    }

    // Ensure MongoDB connection is established (reuses connection on warm start)
    // Use Promise.race to timeout after 5 seconds
    await Promise.race([
      ensureMongoConnection(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('MongoDB connection timeout')), 5000)
      )
    ]).catch((error) => {
      console.error('MongoDB connection error or timeout:', error);
      // Continue execution - let individual requests handle connection errors
    });

    // Debug logging (remove in production)
    if (process.env.NODE_ENV !== 'production') {
      console.log('Event path:', event.path);
      console.log('Event rawPath:', eventV2.rawPath);
      console.log('Event requestContext:', eventV2.requestContext);
      console.log('Using path:', path);
      console.log('Method:', method);
    }

    // Find matching route
    const routeConfig = findRoute(method, path);

    if (!routeConfig) {
      return createApiGatewayResponse(
        {
          status: false,
          code: 404,
          error: 'Ruta no encontrada',
          data: null,
        },
        404,
        origin
      );
    }

    // Create Express-like request/response objects
    const req = createRequest(event);
    
    // Apply matched params to request
    if ('matchedParams' in routeConfig) {
      req.params = { ...req.params, ...(routeConfig as any).matchedParams };
    }

    const res = createResponse();

    // Apply authentication if required
    if (routeConfig.authRequired) {
      await authenticateRequest(req);
    }

    // Apply validation if schema provided
    if (routeConfig.validateSchema) {
      validateRequest(req, routeConfig.validateSchema);
    }

    // Execute route handler
    try {
      await routeConfig.handler(req, res);
    } catch (handlerError) {
      console.error('Error in route handler:', handlerError);
      throw handlerError;
    }

    // Extract response from res object
    const capturedData = (res as any).capturedData;
    const capturedStatus = (res as any).capturedStatus || 200;

    if (!capturedData) {
      console.warn('No data captured in response. Response object:', {
        hasCapturedData: 'capturedData' in res,
        hasCapturedStatus: 'capturedStatus' in res,
        capturedData: (res as any).capturedData,
        capturedStatus: (res as any).capturedStatus,
      });
    }

    // Transform to API Gateway format
    return createApiGatewayResponse(capturedData, capturedStatus, origin);
  } catch (error: unknown) {
    // Global error handling
    console.error('Lambda global catch:', JSON.stringify(error, Object.getOwnPropertyNames(error as object)));
    let statusCode = 500;
    let message = 'Error interno del servidor';

    if (error instanceof AppError) {
      statusCode = error.statusCode;
      message = error.message;
    } else if (error instanceof ZodError) {
      statusCode = 400;
      message = `Error de validación: ${error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ')}`;
    } else if (error instanceof Error) {
      message = error.message;
      // MongoDB duplicate key error (E11000)
      if ('code' in error && (error as any).code === 11000) {
        statusCode = 409;
        message = 'El registro ya existe. El usuario o email ya está en uso.';
      // Fallback for common errors
      } else if (error.message.includes('no encontrado') || error.message.includes('not found')) {
        statusCode = 404;
      } else if (error.message.includes('duplicado') || error.message.includes('duplicate')) {
        statusCode = 409;
      } else if (error.message.includes('validación') || error.message.includes('validation')) {
        statusCode = 400;
      }
    }

    const errorResponse: ErrorResponse = {
      status: false,
      code: statusCode,
      error: message,
      data: null,
      ...(process.env.NODE_ENV === 'development' && error instanceof Error && {
        details: {
          stack: error.stack,
          path: event.path || '',
          method: event.httpMethod || 'GET',
        },
      }),
    };

    return createApiGatewayResponse(errorResponse, statusCode, origin);
  }
}
