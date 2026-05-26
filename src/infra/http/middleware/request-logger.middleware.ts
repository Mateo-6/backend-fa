import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { logger } from '../../utils/logger';
import { AuthenticatedRequest } from '../types/request.types';
import { requestContext } from './request-context';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const requestId = randomUUID();
  (req as AuthenticatedRequest).requestId = requestId;

  const startAt = Date.now();

  const ctx = { requestId, userId: undefined as string | undefined };

  requestContext.run(ctx, () => {
    if (req.path !== '/health') {
      logger.info('Request received', {
        requestId,
        method: req.method,
        path: req.path,
        ip: req.ip,
      });
    }

    res.on('finish', () => {
      // userId may have been set by authMiddleware after context was created
      const userId = (req as AuthenticatedRequest).user?.id;
      ctx.userId = userId;

      const durationMs = Date.now() - startAt;
      const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

      if (req.path === '/health') return;

      logger[level]('Request completed', {
        requestId,
        userId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs,
      });
    });

    next();
  });
}
