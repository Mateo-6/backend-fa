/**
 * Standardized success response structure.
 * 
 * @template T - The type of data contained in the response.
 */
export interface SuccessResponse<T = any> {
  status: true;
  code: number;
  data: T;
}

/**
 * Standardized error response structure.
 */
export interface ErrorResponse {
  status: false;
  code: number;
  error: string;
  data?: null;
  /** Additional error details (only in development mode) */
  details?: {
    stack?: string;
    path?: string;
    method?: string;
  };
}

/**
 * Union type for all possible API responses.
 * 
 * @template T - The type of data contained in success responses.
 */
export type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse;

