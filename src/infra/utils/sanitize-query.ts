import { ValidationError } from '../../domain/errors/app-error';

/**
 * Rejects string values that contain MongoDB operator characters (`$`, `{`)
 * to prevent NoSQL injection through query parameters.
 *
 * @param {string} value The string value to sanitize.
 * @returns {string} The original value if safe.
 * @throws {ValidationError} If the value contains operator characters.
 */
export function sanitizeStringValue(value: string): string {
  if (value.includes('$') || value.includes('{')) {
    throw new ValidationError('Parámetro de búsqueda inválido');
  }
  return value;
}
