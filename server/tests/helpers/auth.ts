import { randomUUID } from 'node:crypto';
import { expect } from 'vitest';
import type { SuperTest, Test } from 'supertest';

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
    refreshToken: string;
  };
}

export async function registerTestUser(
  request: SuperTest<Test>,
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
  };
}