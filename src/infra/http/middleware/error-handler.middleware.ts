import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
}

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

  if (typeof (err as AppError).statusCode === 'number') {
    statusCode = (err as AppError).statusCode!;
    message = err.message;
  } else if (err.message) {
    message = err.message;
    // Common database errors
    if (err.message.includes('not found')) {
      statusCode = 404;
    } else if (err.message.includes('duplicate')) {
      statusCode = 409;
    } else if (err.message.includes('validation')) {
      statusCode = 400;
    }
  }

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      path: req.path,
      method: req.method 
    }),
  });
};

