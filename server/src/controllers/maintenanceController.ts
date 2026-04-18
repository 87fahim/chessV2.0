import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { backfillUserDomainRecords } from '../services/userBackfillService.js';

export const runUserDomainBackfill = asyncHandler(async (_req: Request, res: Response) => {
  await backfillUserDomainRecords();
  res.json({ success: true, data: { message: 'User domain backfill completed' } });
});
