import { Request, Response, NextFunction } from 'express';

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;

/**
 * Wrapper to handle async errors in controllers.
 * Captures errors and forwards them to the error-handling middleware.
 *
 * @param {AsyncRequestHandler} fn Async controller function to wrap.
 * @returns {(req: Request, res: Response, next: NextFunction) => void} Express handler.
 */
export const asyncHandler = (fn: AsyncRequestHandler) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

