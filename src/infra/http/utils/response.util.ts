import { Response } from 'express';
import { SuccessResponse, ErrorResponse } from '../types/response.types';

/**
 * Sends a standardized success response.
 * 
 * @param {Response} res - Express response object.
 * @param {number} code - HTTP status code (default: 200).
 * @param {T} data - Response data payload.
 * @returns {void} Sends the response directly.
 * @template T - The type of data being sent.
 */
export function sendSuccess<T = any>(
  res: Response,
  data: T,
  code: number = 200
): void {
  const response: SuccessResponse<T> = {
    status: true,
    code,
    data,
  };
  res.status(code).json(response);
}

/**
 * Sends a standardized error response.
 * 
 * @param {Response} res - Express response object.
 * @param {number} code - HTTP status code.
 * @param {string} error - Error message.
 * @param {Object} details - Optional additional error details (for development).
 * @returns {void} Sends the response directly.
 */
export function sendError(
  res: Response,
  code: number,
  error: string,
  details?: { stack?: string; path?: string; method?: string }
): void {
  const response: ErrorResponse = {
    status: false,
    code,
    error,
    data: null,
    ...(details && Object.keys(details).length > 0 && { details }),
  };
  res.status(code).json(response);
}

