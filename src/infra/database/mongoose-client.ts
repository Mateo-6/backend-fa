import mongoose from 'mongoose';
import { env } from '../config/env';

// Singleton pattern for the Mongoose client
export class MongooseClientSingleton {
  private static instance: typeof mongoose | null = null;
  private static isConnected: boolean = false;

  private constructor() {}

  /**
   * Retrieves the singleton mongoose instance, connecting if necessary.
   *
   * @returns {Promise<typeof mongoose>} Connected mongoose instance.
   */
  public static async getInstance(): Promise<typeof mongoose> {
    if (!MongooseClientSingleton.instance) {
      MongooseClientSingleton.instance = mongoose;
    }

    if (!MongooseClientSingleton.isConnected) {
      await MongooseClientSingleton.connect();
    }

    return MongooseClientSingleton.instance;
  }

  /**
   * Establishes a MongoDB connection if one has not already been created.
   *
   * @returns {Promise<void>} Resolves once the connection is established.
   */
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

  /**
   * Terminates the MongoDB connection if one is active.
   *
   * @returns {Promise<void>} Resolves when the connection is closed.
   */
  public static async disconnect(): Promise<void> {
    if (MongooseClientSingleton.isConnected && MongooseClientSingleton.instance) {
      await MongooseClientSingleton.instance.disconnect();
      MongooseClientSingleton.isConnected = false;
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🔌 Disconnected from MongoDB');
      }
    }
  }

  /**
   * Indicates whether the application is currently connected to MongoDB.
   *
   * @returns {boolean} True when the connection is active.
   */
  public static isConnectedToDatabase(): boolean {
    return MongooseClientSingleton.isConnected && mongoose.connection.readyState === 1;
  }
}

/**
 * Helper that returns the singleton mongoose instance.
 *
 * @returns {Promise<typeof mongoose>} Connected mongoose instance.
 */
export const getMongooseInstance = async (): Promise<typeof mongoose> => {
  return await MongooseClientSingleton.getInstance();
};

