import { AsyncLocalStorage } from 'async_hooks';
import { ClientSession } from 'mongoose';

export const sessionContext = new AsyncLocalStorage<ClientSession>();
