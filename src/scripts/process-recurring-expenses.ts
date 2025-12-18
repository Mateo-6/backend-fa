import 'dotenv/config';
import { MongooseClientSingleton } from '../infra/database/mongoose-client';
import { RecurringExpenseCronService } from '../application/services/recurring-expense-cron.service';
import { RecurringExpenseMongooseRepository } from '../infra/repositories/recurring-expense-mongoose.repository';
import { TransactionService } from '../application/services/transaction.service';
import { TransactionMongooseRepository } from '../infra/repositories/transaction-mongoose.repository';
import { CategoryMongooseRepository } from '../infra/repositories/category-mongoose.repository';
import { UserMongooseRepository } from '../infra/repositories/user-mongoose.repository';
import { PaymentMethodMongooseRepository } from '../infra/repositories/payment-method-mongoose.repository';

/**
 * CLI script to manually process recurring expenses.
 * This script can be executed directly to process all due recurring expenses.
 *
 * Usage: npm run process-recurring-expenses
 * or: ts-node src/scripts/process-recurring-expenses.ts
 */
async function main(): Promise<void> {
  try {
    console.log('🔄 Connecting to database...');
    await MongooseClientSingleton.connect();
    console.log('✅ Database connected');

    // Initialize dependencies
    const recurringExpenseRepository = new RecurringExpenseMongooseRepository();
    const transactionRepository = new TransactionMongooseRepository();
    const categoryRepository = new CategoryMongooseRepository();
    const userRepository = new UserMongooseRepository();
    const paymentMethodRepository = new PaymentMethodMongooseRepository();

    const transactionService = new TransactionService(
      transactionRepository,
      recurringExpenseRepository,
      categoryRepository,
      userRepository,
      paymentMethodRepository
    );

    const cronService = new RecurringExpenseCronService(recurringExpenseRepository, transactionService);

    console.log('🚀 Starting recurring expense processing...\n');
    const result = await cronService.processDueRecurringExpenses();

    console.log('\n📊 Summary:');
    console.log(`   Processed: ${result.processed}`);
    console.log(`   Errors: ${result.errors}`);
    console.log(`   Total: ${result.processed + result.errors}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error processing recurring expenses:', error);
    process.exit(1);
  }
}

main();
