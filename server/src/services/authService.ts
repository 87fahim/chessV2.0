import { User, IUser } from '../models/User.js';
import { UserSettings } from '../models/UserSettings.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken, TokenPayload } from '../utils/jwt.js';
import { createError } from '../middleware/errorMiddleware.js';
import { ensureUserDomainRecords, recordActivity } from './userService.js';

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

export async function registerUser(input: RegisterInput): Promise<AuthResult> {
  const { username, email, password } = input;

  // Check uniqueness
  const existingUser = await User.findOne({
    $or: [{ email: email.toLowerCase() }, { username }],
  });

  if (existingUser) {
    if (existingUser.email === email.toLowerCase()) {
      throw createError(409, 'Email already registered');
    }
    throw createError(409, 'Username already taken');
  }

  const passwordHash = await hashPassword(password);

  const user = await User.create({
    username,
    email: email.toLowerCase(),
    passwordHash,
    status: 'active',
    authProvider: 'local',
  });

  // Create default settings for the new user
  await UserSettings.create({ userId: user._id });
  await ensureUserDomainRecords(user._id.toString(), user.username);

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
