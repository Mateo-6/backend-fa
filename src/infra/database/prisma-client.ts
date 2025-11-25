import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { env } from '../config/env';

// Singleton pattern for Prisma client
// Prisma 7 requires an explicit adapter with the database URL
export class PrismaClientSingleton {
  private static instance: PrismaClient;

  private constructor() {}

  /**
   * Retrieves the singleton Prisma client instance, instantiating it if needed.
   *
   * @returns {PrismaClient} Shared Prisma client.
   */
  public static getInstance(): PrismaClient {
    if (!PrismaClientSingleton.instance) {
      // Create the MariaDB adapter (MySQL compatible) with the connection URL
      const adapter = new PrismaMariaDb(env.DATABASE_URL);

      PrismaClientSingleton.instance = new PrismaClient({
        adapter,
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      });
    }

    return PrismaClientSingleton.instance;
  }
}

export const prisma = PrismaClientSingleton.getInstance();

