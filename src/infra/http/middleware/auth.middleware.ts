import { Response, NextFunction } from 'express';
import { ITokenService } from '../../../domain/auth/services/token-service.interface';
import { AuthenticatedRequest } from '../types/request.types';
import { UnauthorizedError } from '../../../domain/errors/app-error';

/**
 * Middleware to authenticate requests using JWT tokens.
 * Extracts the token from the Authorization header, verifies it, and attaches user info to the request.
 *
 * @param {ITokenService} tokenService Service for token verification.
 * @returns {(req: AuthenticatedRequest, res: Response, next: NextFunction) => void} Express middleware function.
 */
export const authMiddleware = (tokenService: ITokenService) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      // Extract token from Authorization header
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        throw new UnauthorizedError('Se requiere el encabezado de autorización');
      }

      // Check if header follows "Bearer <token>" format
      const parts = authHeader.split(' ');

      if (parts.length !== 2 || parts[0] !== 'Bearer') {
        throw new UnauthorizedError('Formato de encabezado de autorización inválido. Se espera: Bearer <token>');
      }

      const token = parts[1];

      // Verify token
      const decoded = tokenService.verify(token) as { id: string };

      if (!decoded.id) {
        throw new UnauthorizedError('Carga útil del token inválida');
      }

      // Attach user info to request
      req.user = {
        id: decoded.id,
      };

      next();
    } catch (error) {
      // Ensure all token-related errors are UnauthorizedError with 401 status
      if (error instanceof UnauthorizedError) {
        next(error);
      } else {
        // Convert any other errors (e.g., from token verification) to UnauthorizedError
        next(new UnauthorizedError('Token inválido o expirado'));
      }
    }
  };
};

