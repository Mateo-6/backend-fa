/**
 * Interface for token generation and verification operations.
 * This abstraction allows different token implementations (JWT, custom, etc.).
 */
export interface ITokenService {
  /**
   * Generates a token with the provided payload.
   *
   * @param {object} payload Data to encode in the token.
   * @returns {string} Generated token string.
   */
  generate(payload: object): string;

  /**
   * Verifies and decodes a token, returning its payload.
   *
   * @param {string} token Token string to verify.
   * @returns {object} Decoded token payload.
   * @throws {Error} If the token is invalid or expired.
   */
  verify(token: string): object;
}

