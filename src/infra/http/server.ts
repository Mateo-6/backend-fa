import express, { Application } from 'express';
import healthRoutes from './routes/health.routes';
import userRoutes from './routes/user.routes';
import { env } from '../config/env';
import { errorHandler } from './middleware/error-handler.middleware';

export class Server {
  private readonly app: Application;
  private readonly port: string | number;

  /**
   * Initializes the Express application and registers middleware, routes, and error handling.
   */
  constructor() {
    this.app = express();
    this.port = env.PORT;
    this.configureMiddlewares();
    this.configureRoutes();
    this.configureErrorHandler();
  }

  /**
   * Registers global middleware functions used by the HTTP server.
   *
   * @returns {void} Middleware registration only.
   */
  private configureMiddlewares(): void {
    this.app.use(express.json());
  }

  /**
   * Registers HTTP routes exposed by the server.
   *
   * @returns {void} Route registration only.
   */
  private configureRoutes(): void {
    this.app.use('/health', healthRoutes);
    this.app.use('/users', userRoutes);
  }

  /**
   * Registers the centralized error handler (must run after routes).
   *
   * @returns {void} Error handler registration only.
   */
  private configureErrorHandler(): void {
    // The error handler must be registered last, after all routes
    this.app.use(errorHandler);
  }

  /**
   * Starts listening for HTTP requests on the configured port.
   *
   * @returns {void} Begins the HTTP listener.
   */
  public start(): void {
    this.app.listen(this.port, () => {
      console.log(`✅ Server running on port ${this.port}`);
    });
  }

  /**
   * Exposes the underlying Express application (useful for testing).
   *
   * @returns {Application} The internal Express app instance.
   */
  public getApp(): Application {
    return this.app;
  }
}
