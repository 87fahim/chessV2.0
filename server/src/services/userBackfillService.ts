import { User } from '../models/User.js';
import { logger } from '../utils/logger.js';
import { ensureUserDomainRecords } from './userService.js';

export async function backfillUserDomainRecords(): Promise<void> {
  const users = await User.find().select('_id username');

  if (users.length === 0) {
    logger.info('User backfill skipped: no users found');
    return;
  }

  logger.info(`Starting user domain backfill for ${users.length} users`);

  let processed = 0;
  for (const user of users) {
    await ensureUserDomainRecords(user._id.toString(), user.username);
    processed += 1;
  }

  logger.info(`Completed user domain backfill for ${processed} users`);
}
