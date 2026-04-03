import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import qs from 'qs';

/**
 * Validates the request body (default) or query params against the provided Zod schema
 * and replaces the source with the parsed result before invoking the next middleware.
 *
 * @param {ZodSchema} schema Schema used to validate the request source.
 * @param {'body' | 'query'} target Where to read and write the validated data (default: 'body').
 * @returns {(req: Request, res: Response, next: NextFunction) => void} Express middleware.
 */
export const validate = (schema: ZodSchema, target: 'body' | 'query' = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const source = target === 'query' ? req.query : req.body;
    const validationResult = schema.safeParse(source);

    if (!validationResult.success) {
      res.status(400).json({
        error: 'Error de validación',
        details: validationResult.error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      });
      return;
    }

    if (target === 'query') {
      req.query = validationResult.data as qs.ParsedQs;
    } else {
      req.body = validationResult.data;
    }
    next();
  };
};

