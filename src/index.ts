import 'dotenv/config';
import { Server } from './infra/http/server';
import { MongooseClientSingleton } from './infra/database/mongoose-client';
import { startRecurringExpenseCron } from './infra/cron/recurring-expense-cron';

/**
 * Bootstraps the application by connecting to MongoDB and starting the HTTP server.
 * Also initializes the cron job for processing recurring expenses.
 * Terminates the process if initialization fails.
 *
 * @returns {Promise<void>} Resolves when the bootstrap sequence completes.
 */
async function bootstrap(): Promise<void> {
  try {
    // Initialize MongoDB connection
    await MongooseClientSingleton.connect();
    
    // Initialize server
    const server = new Server();
    server.start();

    // Initialize recurring expense cron job
    startRecurringExpenseCron();
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

bootstrap();