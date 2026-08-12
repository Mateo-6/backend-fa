import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { AuthenticatedRequest } from '../types/request.types';

const rateLimitResponse = (message: string) => (_req: any, res: any) => {
  res.status(429).json({
    status: false,
    code: 429,
    error: message,
  });
};

export const apiRateLimit = rateLimit({
  windowMs: 60_000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitResponse('Demasiadas solicitudes. Intenta de nuevo en un minuto.'),
});

export const loginRateLimit = rateLimit({
  windowMs: 15 * 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitResponse('Demasiados intentos. Inténtalo en 15 minutos.'),
});

export const registerRateLimit = rateLimit({
  windowMs: 60 * 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitResponse('Demasiados registros desde esta IP. Inténtalo en una hora.'),
});

export const amiRateLimit = rateLimit({
  windowMs: 60_000,
  max: 60,
  keyGenerator: (req) => {
    const authenticatedReq = req as AuthenticatedRequest;
    return authenticatedReq.user?.id ?? ipKeyGenerator(req);
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitResponse('Demasiadas solicitudes. Intenta de nuevo en un minuto.'),
});
