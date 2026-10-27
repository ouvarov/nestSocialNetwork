import type { NestExpressApplication } from '@nestjs/platform-express';

import type { AuthResponseDto } from '@/auth/dto/auth-response.dto';

import {
  PASSWORD,
  api,
  bearer,
  createTestApp,
  refreshCookieOf,
  registerUser,
  uniqueEmail,
} from './support';

let app: NestExpressApplication;

beforeAll(async () => {
  app = await createTestApp();
});

afterAll(async () => {
  await app.close();
});

const refresh = (cookie: string) =>
  api(app).post('/api/auth/refresh').set('Cookie', cookie);

describe('register', () => {
  it('returns an access token and the public profile, and sets the refresh cookie', async () => {
    const email = uniqueEmail();
    const response = await api(app)
      .post('/api/auth/register')
      .send({ email, password: PASSWORD, userName: 'Ada' })
      .expect(201);
    const body = response.body as AuthResponseDto;

    expect(body.access_token).toEqual(expect.any(String));
    expect(body.userData).toEqual({
      id: expect.any(String) as string,
      userName: 'Ada',
      imageUrl: null,
      description: expect.any(String) as string,
      created: expect.any(String) as string,
    });

    const cookie = ([] as string[])
      .concat(response.headers['set-cookie'] ?? [])
      .find((value) => value.startsWith('refresh_token='));
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/Path=\/api\/auth/);
    expect(cookie).toMatch(/SameSite=Lax/);
  });

  it('rejects an email that is already registered', async () => {
    const user = await registerUser(app);

    await api(app)
      .post('/api/auth/register')
      .send({ email: user.email, password: PASSWORD, userName: 'Copy' })
      .expect(409);
  });

  it.each([
    ['a short password', { password: 'short' }],
    ['an invalid email', { email: 'not-an-email' }],
    ['an empty name', { userName: '' }],
    ['an unknown field', { isAdmin: true }],
  ])('rejects %s', async (_case, override) => {
    await api(app)
      .post('/api/auth/register')
      .send({
        email: uniqueEmail(),
        password: PASSWORD,
        userName: 'Ada',
        ...override,
      })
      .expect(400);
  });
});

describe('login', () => {
  it('signs in with the right password', async () => {
    const user = await registerUser(app);

    const response = await api(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: PASSWORD })
      .expect(200);

    expect((response.body as AuthResponseDto).userData.id).toBe(user.id);
    expect(refreshCookieOf(response)).not.toBe(user.refreshCookie);
  });

  it('answers a wrong password and an unknown email the same way', async () => {
    const user = await registerUser(app);

    const wrongPassword = await api(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'wrong-password' })
      .expect(401);
    const unknownEmail = await api(app)
      .post('/api/auth/login')
      .send({ email: uniqueEmail(), password: PASSWORD })
      .expect(401);

    expect(unknownEmail.body).toEqual(wrongPassword.body);
  });
});

describe('access token', () => {
  it('is required on private routes', async () => {
    await api(app).get('/api/users').expect(401);
    await api(app)
      .get('/api/users')
      .set('Authorization', 'Bearer not-a-token')
      .expect(401);
  });

  it('opens private routes', async () => {
    const user = await registerUser(app);

    await api(app).get('/api/users').set(bearer(user)).expect(200);
  });

  it('cannot be replaced by the refresh token', async () => {
    const user = await registerUser(app);
    const refreshToken = user.refreshCookie.replace('refresh_token=', '');

    await api(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${refreshToken}`)
      .expect(401);
  });
});

describe('refresh', () => {
  it('rotates the refresh token and issues a working access token', async () => {
    const user = await registerUser(app);

    const response = await refresh(user.refreshCookie).expect(200);
    const body = response.body as AuthResponseDto;

    expect(refreshCookieOf(response)).not.toBe(user.refreshCookie);
    expect(body.userData.id).toBe(user.id);
    await api(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${body.access_token}`)
      .expect(200);
  });

  it('lets two tabs refresh with the same token at once', async () => {
    const user = await registerUser(app);

    const responses = await Promise.all([
      refresh(user.refreshCookie),
      refresh(user.refreshCookie),
    ]);

    expect(responses.map(({ status }) => status)).toEqual([200, 200]);
  });

  it('revokes the whole session when an old token is reused', async () => {
    const user = await registerUser(app);
    const second = refreshCookieOf(
      await refresh(user.refreshCookie).expect(200),
    );
    const third = refreshCookieOf(await refresh(second).expect(200));

    await refresh(user.refreshCookie).expect(401);
    await refresh(third).expect(401);
  });

  it('needs a cookie', async () => {
    await api(app).post('/api/auth/refresh').expect(401);
    await refresh('refresh_token=garbage').expect(401);
  });
});

describe('logout', () => {
  it('clears the cookie and revokes the refresh token', async () => {
    const user = await registerUser(app);

    const response = await api(app)
      .post('/api/auth/logout')
      .set('Cookie', user.refreshCookie)
      .expect(204);

    expect(String(response.headers['set-cookie'])).toMatch(
      /refresh_token=;.*Expires=Thu, 01 Jan 1970/,
    );
    await refresh(user.refreshCookie).expect(401);
  });

  it('succeeds without a cookie', async () => {
    await api(app).post('/api/auth/logout').expect(204);
  });
});
