import rateLimit from 'express-rate-limit';
import { AuthenticatedRequest } from '../types/request.types';

export const amiRateLimit = rateLimit({
  windowMs: 60_000,
  max: 60,
  keyGenerator: (req) => {
    const authenticatedReq = req as AuthenticatedRequest;
    return authenticatedReq.user?.id ?? req.ip ?? 'unknown';
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      status: false,
      code: 429,
      error: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.',
    });
  },
});
