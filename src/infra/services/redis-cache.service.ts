import Redis from 'ioredis';
import { ICache } from '../../domain/cache/cache.interface';
import { logger } from '../utils/logger';

/**
 * Singleton Redis cache service with silent failure semantics.
 * All methods catch errors and return null/void — Redis being unavailable
 * must never crash the application.
 */
export class RedisCacheService implements ICache {
  private readonly client: Redis;

  constructor() {
    const rawUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
    const maskedUrl = rawUrl.replace(/redis(?:s)?:\/\/([^:]+):([^@]+)@/, 'redis://$1:****@');
    logger.info(`Redis target URL: ${maskedUrl}`);
    this.client = new Redis(rawUrl, {
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
    });

    // Suppress unhandled error events — errors are caught per-call
    this.client.on('error', (err) => {
      logger.warn(`Redis connection error: ${err.message}`, {
        redisErr: err instanceof Error ? err.stack : String(err),
      });
    });

    this.client.on('ready', () => {
      logger.info('Redis connected');
    });

    this.client.on('connecting', () => {
      logger.info('Connecting to Redis...');
    });
  }

  /**
   * Retrieves and deserialises a cached value by key.
   * Returns null on cache miss or any Redis error.
   *
   * @template T Expected shape of the cached value.
   * @param {string} key Redis key.
   * @returns {Promise<T | null>} Cached value or null.
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.client.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch (err) {
      logger.warn(`Redis get failed: ${key} — ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  }

  /**
   * Serialises and stores a value in Redis with an expiry.
   *
   * @template T Shape of the value to cache.
   * @param {string} key Redis key.
   * @param {T} value Value to store.
   * @param {number} ttlSeconds Time-to-live in seconds.
   * @returns {Promise<void>}
   */
  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
      logger.info(`Redis set ok: ${key}`);
    } catch (err) {
      logger.warn(`Redis set failed: ${key} — ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Deletes a key from Redis.
   *
   * @param {string} key Redis key to delete.
   * @returns {Promise<void>}
   */
  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch {
      // Silently swallow — cache invalidation failures are non-fatal
    }
  }
}

export const redisCacheService = new RedisCacheService();
