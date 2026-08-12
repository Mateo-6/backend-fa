import 'dotenv/config';
import { Server } from './infra/http/server';
import { MongooseClientSingleton } from './infra/database/mongoose-client';
import { logger } from './infra/utils/logger';

async function bootstrap(): Promise<void> {
  try {
    logger.info('Starting application...');
    await MongooseClientSingleton.connect();
    logger.info('MongoDB connection established');

    const server = new Server();
    server.start();
  } catch (error) {
    logger.error('Failed to start application', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}

bootstrap();
