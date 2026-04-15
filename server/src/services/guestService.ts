import { v4 as uuidv4 } from 'uuid';
import { GuestSession, IGuestSession } from '../models/GuestSession.js';
import { createError } from '../middleware/errorMiddleware.js';

export async function createGuestSession(): Promise<IGuestSession> {
  const guestId = `guest_${uuidv4()}`;
  const session = await GuestSession.create({ guestId });
  return session;
}

export async function getGuestSession(guestId: string): Promise<IGuestSession> {
  const session = await GuestSession.findOne({ guestId });
  if (!session) {
    throw createError(404, 'Guest session not found');
  }

  // Update last seen
  session.lastSeenAt = new Date();
  await session.save();

  return session;
}

export async function touchGuestSession(guestId: string): Promise<void> {
  await GuestSession.updateOne({ guestId }, { lastSeenAt: new Date() });
}
