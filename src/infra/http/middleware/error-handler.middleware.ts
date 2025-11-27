import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../../domain/errors/app-error';
import { sendError } from '../utils/response.util';

/**
 * Centralized Express error-handling middleware that formats error responses.
 *
 * @param {AppError | Error} err The error thrown within the request pipeline.
 * @param {Request} req Express request object where the error originated.
 * @param {Response} res Express response used to send the error payload.
 * @param {NextFunction} next Callback to pass control to the default handler when needed.
 * @returns {void} Sends an HTTP error response.
 */
export const errorHandler = (
  err: AppError | Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // If the response was already sent, delegate to Express' default handler
  if (res.headersSent) {
    return next(err);
  }

  // Determine the status code
  let statusCode = 500;
  let message = 'Internal server error';

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err.message) {
    message = err.message;
    // Fallback for common database errors (should be replaced with proper error classes)
    if (err.message.includes('not found')) {
      statusCode = 404;
    } else if (err.message.includes('duplicate')) {
      statusCode = 409;
    } else if (err.message.includes('validation')) {
      statusCode = 400;
    }
  }

  const details = process.env.NODE_ENV === 'development' ? {
    stack: err.stack,
    path: req.path,
    method: req.method,
  } : undefined;

  sendError(res, statusCode, message, details);
};

