import { Response } from 'express';
import { Notification } from '../../../domain/notification/types/notification.types';
import { logger } from '../../utils/logger';

const HEARTBEAT_INTERVAL_MS = 25_000;

/**
 * In-memory pub/sub hub for real-time notification delivery over SSE.
 * Keeps a set of connected clients per user and pushes events to them
 * as notifications are created. Suitable for single-instance deployments.
 */
class NotificationHub {
  private readonly clientsByUser: Map<string, Set<Response>> = new Map();

  /**
   * Registers a connected SSE client for a user.
   *
   * @param {string} userId User identifier.
   * @param {Response} res Express response kept open for streaming.
   * @returns {() => void} Cleanup function that unsubscribes and clears timers.
   */
  subscribe(userId: string, res: Response): () => void {
    let clients = this.clientsByUser.get(userId);
    if (!clients) {
      clients = new Set();
      this.clientsByUser.set(userId, clients);
    }
    clients.add(res);

    const heartbeat = setInterval(() => {
      if (res.writableEnded || res.destroyed) {
        this.unsubscribe(userId, res);
        return;
      }
      res.write(': heartbeat\n\n');
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      clearInterval(heartbeat);
      this.unsubscribe(userId, res);
    };
  }

  /**
   * Pushes a notification event to all connected clients of a user.
   *
   * @param {string} userId User identifier.
   * @param {Notification} notification Notification to deliver.
   * @returns {void}
   */
  publish(userId: string, notification: Notification): void {
    const clients = this.clientsByUser.get(userId);
    if (!clients || clients.size === 0) return;

    const payload = `event: notification\ndata: ${JSON.stringify(notification)}\n\n`;

    for (const res of clients) {
      if (res.writableEnded || res.destroyed) {
        this.unsubscribe(userId, res);
        continue;
      }
      try {
        res.write(payload);
      } catch (error) {
        logger.error('Failed to deliver SSE notification', {
          userId,
          notificationId: notification.id,
          error: error instanceof Error ? error.message : String(error),
        });
        this.unsubscribe(userId, res);
      }
    }
  }

  /**
   * Removes a client from the hub for a user.
   *
   * @param {string} userId User identifier.
   * @param {Response} res Express response to remove.
   * @returns {void}
   */
  private unsubscribe(userId: string, res: Response): void {
    const clients = this.clientsByUser.get(userId);
    if (!clients) return;
    clients.delete(res);
    if (clients.size === 0) {
      this.clientsByUser.delete(userId);
    }
  }
}

/**
 * Global singleton instance shared across the application.
 */
export const notificationHub = new NotificationHub();