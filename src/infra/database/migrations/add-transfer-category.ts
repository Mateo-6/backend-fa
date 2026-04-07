/**
 * Migration: Add "Transferencia" category (type: transfer) to all existing users.
 *
 * Skips users that already have a transfer category.
 *
 * Usage:
 *   MONGO_URI="mongodb+srv://..." npx ts-node src/infra/database/migrations/add-transfer-category.ts
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URL = process.env.MONGO_URL || process.env.MONGO_URI;

async function migrate() {
  if (!MONGO_URL) {
    console.error('MONGO_URL or MONGO_URI env var is required');
    process.exit(1);
  }

  await mongoose.connect(MONGO_URL);
  console.log('Connected to MongoDB');

  const usersCollection = mongoose.connection.collection('users');
  const categoriesCollection = mongoose.connection.collection('categories');

  const users = await usersCollection.find({}, { projection: { _id: 1 } }).toArray();
  console.log(`Found ${users.length} users`);

  let created = 0;
  let skipped = 0;

  for (const user of users) {
    const existing = await categoriesCollection.findOne({
      user: user._id,
      type: 'transfer',
    });

    if (existing) {
      skipped++;
      continue;
    }

    await categoriesCollection.insertOne({
      name: 'Transferencia',
      description: 'Transferencias entre cuentas',
      type: 'transfer',
      user: user._id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    created++;
  }

  console.log(`Created: ${created}, Skipped (already had transfer category): ${skipped}`);
  await mongoose.disconnect();
  console.log('Migration complete');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
