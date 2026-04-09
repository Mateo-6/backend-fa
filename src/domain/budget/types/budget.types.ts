/**
 * Re-export Budget interface from fa-contracts package.
 * BudgetPeriod is defined locally until fa-contracts is pushed to GitHub and reinstalled.
 */
export type { Budget } from 'fa-contracts';

/**
 * Period options for a budget.
 * TODO: replace with `export { BudgetPeriod } from 'fa-contracts'` once fa-contracts is pushed and reinstalled.
 */
export enum BudgetPeriod {
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}
