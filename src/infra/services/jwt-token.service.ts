import * as jwt from 'jsonwebtoken';
import { ITokenService } from '../../domain/auth/services/token-service.interface';
import { env } from '../config/env';

/**
 * JWT implementation of the token service interface.
 * Uses jsonwebtoken library to generate and verify tokens.
 */
export class JwtTokenService implements ITokenService {
  private readonly secret: string;
  private readonly expiresIn: string = '15m';

  /**
   * Initializes the JWT token service with configuration from environment variables.
   */
  constructor() {
    this.secret = env.JWT_SECRET;
  }

  /**
   * Generates a JWT token with the provided payload.
   *
   * @param {object} payload Data to encode in the token.
   * @returns {string} Generated JWT token string.
   */
  generate(payload: object): string {
    return jwt.sign(payload, this.secret, {
      expiresIn: this.expiresIn,
    } as jwt.SignOptions);
  }

  /**
   * Verifies and decodes a JWT token, returning its payload.
   *
   * @param {string} token JWT token string to verify.
   * @returns {object} Decoded token payload.
   * @throws {Error} If the token is invalid, expired, or malformed.
   */
  verify(token: string): object {
    try {
      return jwt.verify(token, this.secret) as object;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }
}

