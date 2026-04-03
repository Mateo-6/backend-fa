import mongoose from 'mongoose';
import { env } from '../config/env';

// Reject queries that contain MongoDB operators (e.g. { $gt: '' }) to prevent NoSQL injection
mongoose.set('sanitizeFilter', true);

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
    // Check if already connected by verifying actual connection state
    // readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    const readyState = mongoose.connection.readyState;
    if (readyState === 1) {
      MongooseClientSingleton.isConnected = true;
      return;
    }

    try {
      console.log('Attempting to connect to MongoDB with URL:', env.MONGO_URL ? `${env.MONGO_URL.substring(0, 20)}...` : 'NOT SET');
      
      await mongoose.connect(env.MONGO_URL, {
        serverSelectionTimeoutMS: 10000, // Timeout after 10 seconds
        socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        connectTimeoutMS: 10000, // Give up initial connection after 10 seconds
      });

      MongooseClientSingleton.isConnected = mongoose.connection.readyState === 1;
      
      console.log('✅ Connected to MongoDB. Connection state:', mongoose.connection.readyState);
      console.log('Database name:', mongoose.connection.db?.databaseName);
    } catch (error) {
      console.error('❌ Error connecting to MongoDB:', error);
      MongooseClientSingleton.isConnected = false;
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
    const readyState = mongoose.connection.readyState;
    return MongooseClientSingleton.isConnected && readyState === 1;
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

