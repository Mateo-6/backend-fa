import express, { Application } from 'express';
import healthRoutes from './routes/health.routes';
import userRoutes from './routes/user.routes';
import { env } from '../config/env';

export class Server {
  private readonly app: Application;
  private readonly port: string | number;

  constructor() {
    this.app = express();
    this.port = env.PORT;
    this.configureMiddlewares();
    this.configureRoutes();
  }

  private configureMiddlewares(): void {
    this.app.use(express.json());
  }

  private configureRoutes(): void {
    this.app.use('/health', healthRoutes);
    this.app.use('/users', userRoutes);
  }

  public start(): void {
    this.app.listen(this.port, () => {
      console.log(`✅ Server running on port ${this.port}`);
    });
  }

  public getApp(): Application {
    return this.app;
  }
}
