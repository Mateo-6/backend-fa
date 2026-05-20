import Redis from 'ioredis';

/**
 * Singleton Redis cache service with silent failure semantics.
 * All methods catch errors and return null/void — Redis being unavailable
 * must never crash the application.
 */
export class RedisCacheService {
  private readonly client: Redis;

  constructor() {
    this.client = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
    });

    // Suppress unhandled error events — errors are caught per-call
    this.client.on('error', () => {});
  }

  /**
   * Redis key for a user's categories list.
   *
   * @param {string} userId Owner identifier.
   * @returns {string} Redis key string.
   */
  static categoriesKey(userId: string): string {
    return `ami:cats:${userId}`;
  }

  /**
   * Redis key for a user's payment methods list.
   *
   * @param {string} userId Owner identifier.
   * @returns {string} Redis key string.
   */
  static paymentMethodsKey(userId: string): string {
    return `ami:pms:${userId}`;
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
    } catch {
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
    } catch {
      // Silently swallow — cache write failures are non-fatal
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
