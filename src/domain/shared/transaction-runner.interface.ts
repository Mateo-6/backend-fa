export interface ITransactionRunner {
  run<T>(work: () => Promise<T>): Promise<T>;
}
