import { Request } from 'express';

/**
 * Safely extracts a single string value from the route parameters.
 * Express 5 types route params as `string | string[]`; runtime values are
 * always strings in practice, but we validate to fail fast with a clear
 * error rather than silently passing an unexpected shape downstream.
 *
 * @param {Request} req Express request with parsed route params.
 * @param {string} name Parameter name (e.g. "id").
 * @returns {string} The parameter value.
 * @throws {Error} If the parameter is missing or not a plain string.
 */
export function param(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Invalid or missing URL parameter: ${name}`);
  }
  return value;
}