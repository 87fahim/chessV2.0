import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { registerTestUser } from '../helpers/auth.js';
import {
  createIntegrationTestServer,
  type IntegrationTestServer,
} from '../helpers/testServer.js';

describe('auth integration', () => {
  let server: IntegrationTestServer;

  beforeAll(async () => {
    server = await createIntegrationTestServer();
  });

  beforeEach(async () => {
    await server.resetDatabase();
  });

  afterAll(async () => {
    await server.stop();
  });

  it('supports health, register, login, refresh, and logout flows', async () => {
    const healthResponse = await server.request.get('/api/health');
    const authAgent = server.createAgent();

    expect(healthResponse.status).toBe(200);
    expect(healthResponse.body.status).toBe('ok');

    const registeredUser = await registerTestUser(server.request);

    const meResponse = await server.request
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${registeredUser.tokens.accessToken}`);

    expect(meResponse.status).toBe(200);
    expect(meResponse.body.data.user._id).toBe(registeredUser.user._id);
    expect(meResponse.body.data.user.username).toBe(registeredUser.credentials.username);

    const loginResponse = await authAgent.post('/api/auth/login').send({
      login: registeredUser.credentials.email,
      password: registeredUser.credentials.password,
    });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.success).toBe(true);
    expect(loginResponse.body.data.user.username).toBe(registeredUser.credentials.username);
    expect(loginResponse.body.data.tokens.accessToken).toEqual(expect.any(String));
    const initialCookie = (loginResponse.headers['set-cookie'] as string[] | undefined)?.[0];
    expect(initialCookie).toContain('refreshToken=');
    expect(initialCookie).toContain('HttpOnly');

    const refreshResponse = await authAgent.post('/api/auth/refresh').send({});

    expect(refreshResponse.status).toBe(200);
    expect(refreshResponse.body.success).toBe(true);
    expect(refreshResponse.body.data.tokens.accessToken).toEqual(expect.any(String));
    const rotatedCookie = (refreshResponse.headers['set-cookie'] as string[] | undefined)?.[0];
    expect(rotatedCookie).toContain('refreshToken=');
    expect(rotatedCookie).not.toBe(initialCookie);

    const logoutResponse = await authAgent.post('/api/auth/logout').send({});

    expect(logoutResponse.status).toBe(200);
    expect((logoutResponse.headers['set-cookie'] as string[] | undefined)?.[0]).toContain(
      'refreshToken=;',
    );

    const refreshAfterLogout = await authAgent.post('/api/auth/refresh').send({});
    expect(refreshAfterLogout.status).toBe(401);
  });

  it('rejects reused rotated refresh tokens and invalidates the family', async () => {
    const authAgent = server.createAgent();
    const registeredUser = await registerTestUser(server.request);

    const loginResponse = await authAgent.post('/api/auth/login').send({
      login: registeredUser.credentials.email,
      password: registeredUser.credentials.password,
    });

    expect(loginResponse.status).toBe(200);
    const initialCookie = (loginResponse.headers['set-cookie'] as string[] | undefined)?.[0];
    expect(initialCookie).toContain('refreshToken=');

    const refreshResponse = await authAgent.post('/api/auth/refresh').send({});

    expect(refreshResponse.status).toBe(200);
    expect(refreshResponse.body.data.tokens.accessToken).toEqual(expect.any(String));

    const reusedCookieResponse = await server.request
      .post('/api/auth/refresh')
      .set('Cookie', initialCookie as string)
      .send({});

    expect(reusedCookieResponse.status).toBe(401);

    const familyRevokedRefresh = await authAgent.post('/api/auth/refresh').send({});
    expect(familyRevokedRefresh.status).toBe(401);
  });
});