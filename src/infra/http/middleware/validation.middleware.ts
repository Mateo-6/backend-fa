import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Validates the request body against the provided Zod schema and replaces it
 * with the parsed result before invoking the next middleware.
 *
 * @param {ZodSchema} schema Schema used to validate the request body.
 * @returns {(req: Request, res: Response, next: NextFunction) => void} Express middleware.
 */
export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const validationResult = schema.safeParse(req.body);

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

    // Replace req.body with validated data (sanitized by Zod)
    req.body = validationResult.data;
    next();
  };
};

