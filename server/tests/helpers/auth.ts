import { randomUUID } from 'node:crypto';
import { expect } from 'vitest';

interface RequestClient {
  post: (path: string) => {
    send: (body?: unknown) => Promise<{
      status: number;
      body: {
        success?: boolean;
        data: {
          user: {
            _id: string;
            username: string;
            email: string;
          };
          tokens: {
            accessToken: string;
          };
        };
      };
      headers: Record<string, string | string[] | undefined>;
    }>;
  };
}

export interface RegisteredTestUser {
  credentials: {
    username: string;
    email: string;
    password: string;
  };
  user: {
    _id: string;
    username: string;
    email: string;
  };
  tokens: {
    accessToken: string;
  };
  setCookieHeader: string[];
}

export async function registerTestUser(
  request: RequestClient,
  overrides: Partial<{ username: string; email: string; password: string }> = {},
): Promise<RegisteredTestUser> {
  const unique = randomUUID().replace(/-/g, '').slice(0, 12);
  const credentials = {
    username: overrides.username ?? `user_${unique}`,
    email: overrides.email ?? `${unique}@example.com`,
    password: overrides.password ?? 'Password123!',
  };

  const response = await request.post('/api/auth/register').send(credentials);

  expect(response.status).toBe(201);
  expect(response.body.success).toBe(true);

  return {
    credentials,
    user: response.body.data.user,
    tokens: response.body.data.tokens,
    setCookieHeader: (response.headers['set-cookie'] as string[] | undefined) ?? [],
  };
}