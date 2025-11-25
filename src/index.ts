import 'dotenv/config';
import { Server } from './infra/http/server';
import { MongooseClientSingleton } from './infra/database/mongoose-client';

async function bootstrap() {
  try {
    // Initialize MongoDB connection
    await MongooseClientSingleton.connect();
    
    // Initialize server
    const server = new Server();
    server.start();
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

bootstrap();