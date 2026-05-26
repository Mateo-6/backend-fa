import { Request } from 'express';

/**
 * Extended Express Request interface that includes authenticated user information.
 * Used by middleware and controllers that require authentication.
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
  };
  requestId?: string;
}

