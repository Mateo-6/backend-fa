import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../../domain/errors/app-error';
import { sendError } from '../utils/response.util';
import { logger } from '../../utils/logger';
import { AuthenticatedRequest } from '../types/request.types';

export const errorHandler = (
  err: AppError | Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (res.headersSent) {
    return next(err);
  }

  const authReq = req as AuthenticatedRequest;
  const requestId = authReq.requestId;
  const userId    = authReq.user?.id;

  let statusCode = 500;
  let message = 'Error interno del servidor';

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err.message) {
    message = err.message;
    if (err.message.includes('no encontrado') || err.message.includes('not found')) {
      statusCode = 404;
    } else if (err.message.includes('duplicado') || err.message.includes('duplicate')) {
      statusCode = 409;
    } else if (err.message.includes('validación') || err.message.includes('validation')) {
      statusCode = 400;
    }
  }

  const logLevel = statusCode >= 500 ? 'error' : 'warn';

  logger[logLevel]('Request error', {
    requestId,
    userId,
    method: req.method,
    path: req.path,
    statusCode,
    error: err.message,
    stack: err.stack,
    errorType: err.constructor.name,
  });

  const details = process.env.NODE_ENV === 'development' ? {
    stack: err.stack,
    path: req.path,
    method: req.method,
  } : undefined;

  sendError(res, statusCode, message, details);
};
