import { type ClientSession } from 'mongoose';
import { User, IUser } from '../models/User.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken, TokenPayload } from '../utils/jwt.js';
import { createError } from '../middleware/errorMiddleware.js';
import { ensureUserDomainRecords, recordActivity } from './userService.js';
import { logger } from '../utils/logger.js';

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
  refreshToken: string;
}

export interface AuthResult {
  user: IUser;
  tokens: AuthTokens;
}

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

function buildAuthTokens(user: IUser): AuthTokens {
  const payload: TokenPayload = {
    userId: user._id.toString(),
    username: user.username,
    role: user.role,
  };

  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
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

  return { user, tokens: buildAuthTokens(user) };
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

  const isMatch = await comparePassword(password, user.passwordHash);
  if (!isMatch) {
    user.failedLoginCount = (user.failedLoginCount ?? 0) + 1;
    await user.save();
    throw createError(401, 'Invalid credentials');
  }

  user.failedLoginCount = 0;
  user.lastLoginAt = new Date();
  await user.save();

  await recordActivity(user._id.toString(), {
    activityType: 'login',
    feature: 'auth',
  });

  const payload: TokenPayload = {
    userId: user._id.toString(),
    username: user.username,
    role: user.role,
  };

  const tokens: AuthTokens = {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };

  return { user, tokens };
}

export async function refreshTokens(refreshToken: string): Promise<AuthTokens> {
  const payload = verifyRefreshToken(refreshToken);

  // Verify user still exists
  const user = await User.findById(payload.userId);
  if (!user) {
    throw createError(401, 'User no longer exists');
  }

  const newPayload: TokenPayload = {
    userId: user._id.toString(),
    username: user.username,
    role: user.role,
  };

  return {
    accessToken: signAccessToken(newPayload),
    refreshToken: signRefreshToken(newPayload),
  };
}

export async function getUserById(userId: string): Promise<IUser> {
  const user = await User.findById(userId);
  if (!user) {
    throw createError(404, 'User not found');
  }
  return user;
}
