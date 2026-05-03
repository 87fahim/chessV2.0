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

  it('supports health, register, login, me, and refresh flows', async () => {
    const healthResponse = await server.request.get('/api/health');

    expect(healthResponse.status).toBe(200);
    expect(healthResponse.body.status).toBe('ok');

    const registeredUser = await registerTestUser(server.request);

    const meResponse = await server.request
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${registeredUser.tokens.accessToken}`);

    expect(meResponse.status).toBe(200);
    expect(meResponse.body.data.user._id).toBe(registeredUser.user._id);
    expect(meResponse.body.data.user.username).toBe(registeredUser.credentials.username);

    const loginResponse = await server.request.post('/api/auth/login').send({
      login: registeredUser.credentials.email,
      password: registeredUser.credentials.password,
    });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.success).toBe(true);
    expect(loginResponse.body.data.user.username).toBe(registeredUser.credentials.username);
    expect(loginResponse.body.data.tokens.accessToken).toEqual(expect.any(String));
    expect(loginResponse.body.data.tokens.refreshToken).toEqual(expect.any(String));

    const refreshResponse = await server.request.post('/api/auth/refresh').send({
      refreshToken: loginResponse.body.data.tokens.refreshToken,
    });

    expect(refreshResponse.status).toBe(200);
    expect(refreshResponse.body.success).toBe(true);
    expect(refreshResponse.body.data.tokens.accessToken).toEqual(expect.any(String));
    expect(refreshResponse.body.data.tokens.refreshToken).toEqual(expect.any(String));
  });
});