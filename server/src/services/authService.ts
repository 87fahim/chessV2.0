import { randomUUID } from 'node:crypto';
import { type ClientSession } from 'mongoose';
import { User, IUser } from '../models/User.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  TokenPayload,
  type RefreshTokenPayload,
} from '../utils/jwt.js';
import { createError } from '../middleware/errorMiddleware.js';
import { ensureUserDomainRecords, recordActivity } from './userService.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';
import { durationToMs } from '../utils/duration.js';

const MAX_FAILED_LOGINS = 5;
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000;

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
}

export interface LoginInput {
  login: string; // email or username
  password: string;
}

export interface AuthTokens {
  accessToken: string;
}

export interface AuthResult {
  user: IUser;
  tokens: AuthTokens;
  refreshToken: string;
}

interface IssuedSessionTokens {
  accessToken: string;
  refreshToken: string;
  tokenId: string;
  familyId: string;
}

const refreshTokenMaxAgeMs = durationToMs(env.JWT_REFRESH_EXPIRES_IN);

function isTransactionUnavailableError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const code = typeof error === 'object' && error !== null && 'code' in error
    ? (error as { code?: number }).code
    : undefined;
  const message = error.message.toLowerCase();

  return (
    code === 20 ||
    message.includes('transaction numbers are only allowed on a replica set member or mongos') ||
    message.includes('transactions are not supported') ||
    message.includes('standalone servers do not support transactions') ||
    message.includes('current topology does not support sessions') ||
    message.includes('current topology does not support retryable writes') ||
    message.includes('does not support sessions')
  );
}

async function createRegisteredUser(input: RegisterInput, session?: ClientSession): Promise<IUser> {
  const normalizedEmail = input.email.toLowerCase();
  const existingUserQuery = User.findOne({
    $or: [{ email: normalizedEmail }, { username: input.username }],
  });

  if (session) {
    existingUserQuery.session(session);
  }

  const existingUser = await existingUserQuery;

  if (existingUser) {
    if (existingUser.email === normalizedEmail) {
      throw createError(409, 'Email already registered');
    }
    throw createError(409, 'Username already taken');
  }

  const passwordHash = await hashPassword(input.password);
  const userPayload = {
    username: input.username,
    email: normalizedEmail,
    passwordHash,
    status: 'active' as const,
    authProvider: 'local' as const,
  };
  const createdUser = session
    ? (await User.create([userPayload], { session }))[0]
    : await User.create(userPayload);

  await ensureUserDomainRecords(createdUser._id.toString(), createdUser.username, session);

  return createdUser;
}

function buildTokenPayload(user: IUser): TokenPayload {
  return {
    userId: user._id.toString(),
    username: user.username,
    role: user.role,
  };
}

async function issueSessionTokens(user: IUser, familyId?: string): Promise<IssuedSessionTokens> {
  const tokenPayload = buildTokenPayload(user);
  const tokenId = randomUUID();
  const resolvedFamilyId = familyId ?? randomUUID();
  const refreshPayload: RefreshTokenPayload = {
    ...tokenPayload,
    tokenId,
    familyId: resolvedFamilyId,
  };

  const refreshToken = signRefreshToken(refreshPayload);
  await RefreshToken.create({
    userId: user._id,
    tokenId,
    familyId: resolvedFamilyId,
    expiresAt: new Date(Date.now() + refreshTokenMaxAgeMs),
  });

  return {
    accessToken: signAccessToken(tokenPayload),
    refreshToken,
    tokenId,
    familyId: resolvedFamilyId,
  };
}

async function revokeRefreshTokenFamily(familyId: string): Promise<void> {
  await RefreshToken.updateMany(
    { familyId, revokedAt: { $exists: false } },
    { $set: { revokedAt: new Date() } },
  );
}

function verifyRefreshTokenOrThrow(refreshToken: string): RefreshTokenPayload {
  try {
    return verifyRefreshToken(refreshToken);
  } catch {
    throw createError(401, 'Invalid or expired refresh token');
  }
}

export async function registerUser(input: RegisterInput): Promise<AuthResult> {
  let session: ClientSession | null = null;
  let user: IUser | null = null;

  try {
    session = await User.startSession();
    await session.withTransaction(async () => {
      user = await createRegisteredUser(input, session ?? undefined);
    });
  } catch (error) {
    if (!isTransactionUnavailableError(error)) {
      throw error;
    }

    logger.warn('Mongo transactions unavailable during registration; using non-transactional fallback');
    user = await createRegisteredUser(input);
  } finally {
    if (session) {
      await session.endSession();
    }
  }

  if (!user) {
    throw createError(500, 'Registration failed');
  }

  const issuedTokens = await issueSessionTokens(user);

  return {
    user,
    tokens: { accessToken: issuedTokens.accessToken },
    refreshToken: issuedTokens.refreshToken,
  };
}

export async function loginUser(input: LoginInput): Promise<AuthResult> {
  const { login, password } = input;

  // Find by email or username
  const user = await User.findOne({
    $or: [{ email: login.toLowerCase() }, { username: login }],
  });

  if (!user) {
    throw createError(401, 'Invalid credentials');
  }

  if (user.status !== 'active') {
    throw createError(403, `Account is ${user.status}`);
  }

  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000);
    throw createError(429, `Too many failed login attempts. Try again in ${minutesLeft} minute(s).`);
  }

  const isMatch = await comparePassword(password, user.passwordHash);
  if (!isMatch) {
    user.failedLoginCount = (user.failedLoginCount ?? 0) + 1;
    // Temporary per-account lockout complements the per-IP rate limit, which
    // a distributed credential-stuffing attack can otherwise sidestep.
    if (user.failedLoginCount >= MAX_FAILED_LOGINS) {
      user.lockedUntil = new Date(Date.now() + LOGIN_LOCKOUT_MS);
      user.failedLoginCount = 0;
    }
    await user.save();
    throw createError(401, 'Invalid credentials');
  }

  user.failedLoginCount = 0;
  user.lockedUntil = undefined;
  user.lastLoginAt = new Date();
  await user.save();

  await recordActivity(user._id.toString(), {
    activityType: 'login',
    feature: 'auth',
  });

  const issuedTokens = await issueSessionTokens(user);

  return {
    user,
    tokens: { accessToken: issuedTokens.accessToken },
    refreshToken: issuedTokens.refreshToken,
  };
}

export async function refreshTokens(
  refreshToken: string,
): Promise<{ tokens: AuthTokens; refreshToken: string }> {
  const payload = verifyRefreshTokenOrThrow(refreshToken);
  const now = new Date();

  // Verify user still exists before rotating the session.
  const user = await User.findById(payload.userId);
  if (!user) {
    throw createError(401, 'User no longer exists');
  }

  if (user.status !== 'active') {
    throw createError(403, `Account is ${user.status}`);
  }

  // Invalidate sessions issued before a password change.
  if (
    user.passwordChangedAt &&
    payload.iat &&
    user.passwordChangedAt.getTime() > payload.iat * 1000
  ) {
    await revokeRefreshTokenFamily(payload.familyId);
    throw createError(401, 'Invalid or expired refresh token');
  }

  // Issue the replacement first, then atomically claim the previous token.
  // If the claim fails (reuse / race / expiry), revoke the whole family.
  const issuedTokens = await issueSessionTokens(user, payload.familyId);
  const claimedToken = await RefreshToken.findOneAndUpdate(
    {
      tokenId: payload.tokenId,
      familyId: payload.familyId,
      userId: payload.userId,
      revokedAt: { $exists: false },
      replacedByTokenId: { $exists: false },
      expiresAt: { $gt: now },
    },
    {
      $set: {
        revokedAt: now,
        lastUsedAt: now,
        replacedByTokenId: issuedTokens.tokenId,
      },
    },
  );

  if (!claimedToken) {
    await revokeRefreshTokenFamily(payload.familyId);
    throw createError(401, 'Invalid or expired refresh token');
  }

  return {
    tokens: { accessToken: issuedTokens.accessToken },
    refreshToken: issuedTokens.refreshToken,
  };
}

export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  let payload: RefreshTokenPayload;

  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    return;
  }

  await RefreshToken.updateOne(
    {
      tokenId: payload.tokenId,
      familyId: payload.familyId,
      userId: payload.userId,
      revokedAt: { $exists: false },
    },
    {
      $set: {
        revokedAt: new Date(),
        lastUsedAt: new Date(),
      },
    },
  );
}

export async function getUserById(userId: string): Promise<IUser> {
  const user = await User.findById(userId);
  if (!user) {
    throw createError(404, 'User not found');
  }
  return user;
}
