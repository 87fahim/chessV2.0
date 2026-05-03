import mongoose from 'mongoose';
import { validateEnv } from '../config/env.js';
import { connectDB } from '../config/db.js';
import { backfillUserDomainRecords } from '../services/userBackfillService.js';
import { logger } from '../utils/logger.js';

async function main(): Promise<void> {
  validateEnv();
  await connectDB();

  try {
    await backfillUserDomainRecords();
  } finally {
    await mongoose.disconnect();
  }
}

main()
  .then(() => {
    logger.info('User domain backfill migration completed');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('User domain backfill migration failed', error);
    process.exit(1);
  });