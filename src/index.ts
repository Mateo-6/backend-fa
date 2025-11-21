import 'dotenv/config';
import { Server } from './infra/http/server';

const server = new Server();
server.start();