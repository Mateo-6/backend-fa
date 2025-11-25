import mongoose from 'mongoose';
import { env } from '../config/env';

// Singleton pattern for the Mongoose client
export class MongooseClientSingleton {
  private static instance: typeof mongoose | null = null;
  private static isConnected: boolean = false;

  private constructor() {}

  public static async getInstance(): Promise<typeof mongoose> {
    if (!MongooseClientSingleton.instance) {
      MongooseClientSingleton.instance = mongoose;
    }

    if (!MongooseClientSingleton.isConnected) {
      await MongooseClientSingleton.connect();
    }

    return MongooseClientSingleton.instance;
  }

  public static async connect(): Promise<void> {
    if (MongooseClientSingleton.isConnected) {
      return;
    }

    try {
      await mongoose.connect(env.MONGO_URL, {
        // Recommended connection options
      });

      MongooseClientSingleton.isConnected = true;
      
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Connected to MongoDB');
      }
    } catch (error) {
      console.error('❌ Error connecting to MongoDB:', error);
      throw error;
    }
  }

  public static async disconnect(): Promise<void> {
    if (MongooseClientSingleton.isConnected && MongooseClientSingleton.instance) {
      await MongooseClientSingleton.instance.disconnect();
      MongooseClientSingleton.isConnected = false;
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🔌 Disconnected from MongoDB');
      }
    }
  }

  public static isConnectedToDatabase(): boolean {
    return MongooseClientSingleton.isConnected && mongoose.connection.readyState === 1;
  }
}

// Export a helper function to get the instance
export const getMongooseInstance = async () => {
  return await MongooseClientSingleton.getInstance();
};

