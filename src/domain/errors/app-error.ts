/**
 * Base class for application errors with HTTP status codes.
 * All custom errors should extend this class.
 */
export class AppError extends Error {
  public readonly statusCode: number;

  /**
   * Creates a new application error.
   *
   * @param {string} message Error message.
   * @param {number} statusCode HTTP status code (default: 500).
   */
  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error thrown when a requested resource is not found.
 * Maps to HTTP 404.
 */
export class NotFoundError extends AppError {
  /**
   * Creates a new not found error.
   *
   * @param {string} resource Name of the resource that was not found (e.g., "User", "Category").
   * @param {string} identifier Optional identifier that was searched for.
   */
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} with id '${identifier}' not found`
      : `${resource} not found`;
    super(message, 404);
  }
}

/**
 * Error thrown when authentication fails or user is not authenticated.
 * Maps to HTTP 401.
 */
export class UnauthorizedError extends AppError {
  /**
   * Creates a new unauthorized error.
   *
   * @param {string} message Optional custom error message (default: "Unauthorized").
   */
  constructor(message: string = 'Unauthorized') {
    super(message, 401);
  }
}

/**
 * Error thrown when a user tries to access a resource they don't own.
 * Maps to HTTP 403.
 */
export class ForbiddenError extends AppError {
  /**
   * Creates a new forbidden error.
   *
   * @param {string} message Optional custom error message (default: "Forbidden").
   */
  constructor(message: string = 'Forbidden: You do not have permission to access this resource') {
    super(message, 403);
  }
}

/**
 * Error thrown when a validation fails.
 * Maps to HTTP 400.
 */
export class ValidationError extends AppError {
  /**
   * Creates a new validation error.
   *
   * @param {string} message Validation error message.
   */
  constructor(message: string) {
    super(message, 400);
  }
}

/**
 * Error thrown when a conflict occurs (e.g., duplicate resource).
 * Maps to HTTP 409.
 */
export class ConflictError extends AppError {
  /**
   * Creates a new conflict error.
   *
   * @param {string} message Conflict error message.
   */
  constructor(message: string) {
    super(message, 409);
  }
}

