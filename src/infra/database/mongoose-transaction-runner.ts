import mongoose from 'mongoose';
import { ITransactionRunner } from '../../domain/shared/transaction-runner.interface';
import { sessionContext } from './session-context';

export class MongooseTransactionRunner implements ITransactionRunner {
  async run<T>(work: () => Promise<T>): Promise<T> {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const result = await sessionContext.run(session, work);
      await session.commitTransaction();
      return result;
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }
}
