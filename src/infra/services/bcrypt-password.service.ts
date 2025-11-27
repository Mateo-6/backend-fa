import * as bcrypt from 'bcrypt';
import { IPasswordService } from '../../domain/auth/services/password-service.interface';

/**
 * Bcrypt implementation of the password service interface.
 * Uses bcrypt library for password hashing and comparison.
 */
export class BcryptPasswordService implements IPasswordService {
  private readonly saltRounds: number = 10;

  /**
   * Hashes a plain text password using bcrypt.
   *
   * @param {string} password Plain text password to hash.
   * @returns {Promise<string>} Hashed password string.
   */
  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  /**
   * Compares a plain text password with a hashed password using bcrypt.
   *
   * @param {string} plainPassword Plain text password to compare.
   * @param {string} hashedPassword Hashed password to compare against.
   * @returns {Promise<boolean>} True if passwords match, false otherwise.
   */
  async compare(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }
}

