/**
 * Interface for password hashing and comparison operations.
 * This abstraction allows different password hashing implementations (bcrypt, argon2, etc.).
 */
export interface IPasswordService {
  /**
   * Hashes a plain text password.
   *
   * @param {string} password Plain text password to hash.
   * @returns {Promise<string>} Hashed password string.
   */
  hash(password: string): Promise<string>;

  /**
   * Compares a plain text password with a hashed password.
   *
   * @param {string} plainPassword Plain text password to compare.
   * @param {string} hashedPassword Hashed password to compare against.
   * @returns {Promise<boolean>} True if passwords match, false otherwise.
   */
  compare(plainPassword: string, hashedPassword: string): Promise<boolean>;
}

