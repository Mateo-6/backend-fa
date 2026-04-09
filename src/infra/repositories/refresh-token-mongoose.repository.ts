import mongoose from 'mongoose';
import { RefreshTokenRepository } from '../../domain/auth/repositories/refresh-token.repository';
import { RefreshTokenModel } from '../database/models/refresh-token.model';
import { getMongooseInstance } from '../database/mongoose-client';

/**
 * Mongoose implementation of RefreshTokenRepository.
 */
export class RefreshTokenMongooseRepository implements RefreshTokenRepository {
  /**
   * Persists a new refresh token hash linked to a user.
   *
   * @param {string} userId Owner identifier.
   * @param {string} tokenHash SHA-256 hash of the refresh token.
   * @param {Date} expiresAt Expiration date of the refresh token.
   * @returns {Promise<void>} Resolves when the token is stored.
   */
  async create(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await getMongooseInstance();
    await RefreshTokenModel.create({
      tokenHash,
      userId: new mongoose.Types.ObjectId(userId),
      expiresAt,
    });
  }

  /**
   * Finds a stored token by its hash.
   *
   * @param {string} tokenHash SHA-256 hash of the refresh token.
   * @returns {Promise<{ userId: string; expiresAt: Date } | null>} Token data or null if not found.
   */
  async findByHash(tokenHash: string): Promise<{ userId: string; expiresAt: Date } | null> {
    await getMongooseInstance();
    const doc = await RefreshTokenModel.findOne({ tokenHash }).exec();
    if (!doc) {
      return null;
    }
    return {
      userId: doc.userId.toString(),
      expiresAt: doc.expiresAt,
    };
  }

  /**
   * Deletes a stored token by its hash.
   *
   * @param {string} tokenHash SHA-256 hash of the refresh token.
   * @returns {Promise<void>} Resolves when the token is deleted.
   */
  async deleteByHash(tokenHash: string): Promise<void> {
    await getMongooseInstance();
    await RefreshTokenModel.deleteOne({ tokenHash }).exec();
  }

  /**
   * Deletes all refresh tokens belonging to a user.
   *
   * @param {string} userId Owner identifier.
   * @returns {Promise<void>} Resolves when all tokens are deleted.
   */
  async deleteAllByUser(userId: string): Promise<void> {
    await getMongooseInstance();
    await RefreshTokenModel.deleteMany({ userId: new mongoose.Types.ObjectId(userId) }).exec();
  }
}
