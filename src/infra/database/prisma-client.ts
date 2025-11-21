import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { env } from '../config/env';

// Singleton pattern para el cliente de Prisma
// Prisma 7 requiere un adaptador explícito con la URL de la base de datos
export class PrismaClientSingleton {
  private static instance: PrismaClient;

  private constructor() {}

  public static getInstance(): PrismaClient {
    if (!PrismaClientSingleton.instance) {
      // Crear el adaptador MariaDB (compatible con MySQL) con la URL de conexión
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

