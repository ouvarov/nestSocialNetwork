import { ConflictException, UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';

import type { Env } from '@/config/env.schema';
import type { AuthDatabaseService } from '@/database/auth-database.service';
import type {
  NewRefreshToken,
  RefreshTokenDatabaseService,
} from '@/database/refresh-token-database.service';
import type { RefreshToken } from '@/database/schemas/refreshTokens.schema';
import type { User } from '@/database/schemas/users.schema';
import type { UserSocketsService } from '@/realtime/user-sockets.service';
import type { UserService } from '@/user/user.service';

import { AuthService } from '../auth.service';

const ACCESS_SECRET = 'a'.repeat(32);
const REFRESH_SECRET = 'r'.repeat(32);
const PASSWORD = 'correct-horse-battery';

const createUserStore = () => {
  const users = new Map<string, User>();

  const userService = {
    findOneByEmail: (email: string) =>
      Promise.resolve(
        [...users.values()].find((user) => user.email === email) ?? null,
      ),
    findOneById: (id: string) => Promise.resolve(users.get(id) ?? null),
  };

  const authDatabaseService = {
    createUser: ({
      userName,
      email,
      password,
    }: {
      userName: string;
      email: string;
      password: string;
    }) => {
      if ([...users.values()].some((user) => user.email === email)) {
        return Promise.reject(Object.assign(new Error(), { code: '23505' }));
      }

      const user: User = {
        user_id: randomUUID(),
        user_name: userName,
        email,
        password,
        image_url: null,
        description: '',
        created: new Date(),
      };
      users.set(user.user_id, user);
      return Promise.resolve(user);
    },
  };

  return { userService, authDatabaseService };
};

const createRefreshTokenStore = () => {
  const tokens = new Map<string, RefreshToken>();

  const toRecord = (token: NewRefreshToken): RefreshToken => ({
    token_id: token.tokenId,
    user_id: token.userId,
    family_id: token.familyId,
    expires_at: token.expiresAt,
    revoked_at: null,
    replaced_by: null,
    created_at: new Date(),
  });

  const revokeWhere = (matches: (token: RefreshToken) => boolean) => {
    for (const token of tokens.values()) {
      if (matches(token) && !token.revoked_at) token.revoked_at = new Date();
    }
  };

  const store = {
    create: (token: NewRefreshToken) => {
      tokens.set(token.tokenId, toRecord(token));
      return Promise.resolve();
    },
    findById: (tokenId: string) => Promise.resolve(tokens.get(tokenId) ?? null),
    rotate: (currentTokenId: string, nextToken: NewRefreshToken) => {
      const current = tokens.get(currentTokenId);
      if (!current || current.revoked_at) return Promise.resolve(false);

      current.revoked_at = new Date();
      current.replaced_by = nextToken.tokenId;
      tokens.set(nextToken.tokenId, toRecord(nextToken));
      return Promise.resolve(true);
    },
    revokeFamily: (familyId: string) => {
      revokeWhere((token) => token.family_id === familyId);
      return Promise.resolve();
    },
  };

  return { store, tokens };
};

const createAuthService = () => {
  const { userService, authDatabaseService } = createUserStore();
  const { store, tokens } = createRefreshTokenStore();
  const jwtService = new JwtService({
    secret: ACCESS_SECRET,
    signOptions: { expiresIn: '15m' },
  });
  const disconnectedUserIds: string[] = [];
  const userSocketsService = {
    disconnectUser: (userId: string) => disconnectedUserIds.push(userId),
  };
  const configService = {
    get: (key: keyof Env) =>
      key === 'REFRESH_TOKEN_SECRET' ? REFRESH_SECRET : undefined,
  };

  const authService = new AuthService(
    jwtService,
    userService as unknown as UserService,
    authDatabaseService as unknown as AuthDatabaseService,
    store as unknown as RefreshTokenDatabaseService,
    userSocketsService as unknown as UserSocketsService,
    configService as unknown as ConfigService<Env, true>,
  );

  return { authService, jwtService, tokens, disconnectedUserIds };
};

const GRACE_WINDOW_PASSED_MS = 11_000;

const ageRotations = (tokens: Map<string, RefreshToken>) => {
  for (const token of tokens.values()) {
    if (token.revoked_at) {
      token.revoked_at = new Date(
        token.revoked_at.getTime() - GRACE_WINDOW_PASSED_MS,
      );
    }
  }
};

describe('AuthService', () => {
  const registerAda = (authService: AuthService) =>
    authService.register({
      userName: 'Ada Lovelace',
      email: 'ada@example.com',
      password: PASSWORD,
    });

  describe('register', () => {
    it('returns an access token for the new user and stores a refresh token', async () => {
      const { authService, jwtService, tokens } = createAuthService();

      const session = await registerAda(authService);
      const payload = await jwtService.verifyAsync<{
        sub: string;
        typ: string;
      }>(session.accessToken);

      expect(payload).toMatchObject({ sub: session.user.id, typ: 'access' });
      expect(tokens.size).toBe(1);
      expect(session.user).not.toHaveProperty('password');
    });

    it('rejects an email that is already registered with 409', async () => {
      const { authService } = createAuthService();
      await registerAda(authService);

      await expect(registerAda(authService)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('login', () => {
    it('gives the same 401 for an unknown email and a wrong password', async () => {
      const { authService } = createAuthService();
      await registerAda(authService);

      const unknownEmail = authService.login({
        email: 'nobody@example.com',
        password: PASSWORD,
      });
      const wrongPassword = authService.login({
        email: 'ada@example.com',
        password: 'wrong-password',
      });

      await expect(unknownEmail).rejects.toThrow(
        new UnauthorizedException('Invalid credentials'),
      );
      await expect(wrongPassword).rejects.toThrow(
        new UnauthorizedException('Invalid credentials'),
      );
    });

    it('starts a session for valid credentials', async () => {
      const { authService } = createAuthService();
      const { user } = await registerAda(authService);

      const session = await authService.login({
        email: 'ada@example.com',
        password: PASSWORD,
      });

      expect(session.user.id).toBe(user.id);
    });
  });

  describe('refresh', () => {
    it('rotates the refresh token and the new one keeps working', async () => {
      const { authService } = createAuthService();
      const { refreshToken } = await registerAda(authService);

      const rotated = await authService.refresh(refreshToken);
      const rotatedAgain = await authService.refresh(rotated.refreshToken);

      expect(rotated.refreshToken).not.toBe(refreshToken);
      expect(rotatedAgain.user.id).toBe(rotated.user.id);
    });

    it('treats a reused refresh token as theft and revokes the whole family', async () => {
      const { authService, tokens, disconnectedUserIds } = createAuthService();
      const { refreshToken: stolenToken, user } =
        await registerAda(authService);
      const { refreshToken: currentToken } =
        await authService.refresh(stolenToken);
      ageRotations(tokens);

      await expect(authService.refresh(stolenToken)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(disconnectedUserIds).toEqual([user.id]);
      await expect(authService.refresh(currentToken)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('lets concurrent refreshes with the same token all succeed', async () => {
      const { authService } = createAuthService();
      const { refreshToken } = await registerAda(authService);

      const sessions = await Promise.all([
        authService.refresh(refreshToken),
        authService.refresh(refreshToken),
      ]);

      for (const session of sessions) {
        await expect(
          authService.refresh(session.refreshToken),
        ).resolves.toMatchObject({ user: { userName: 'Ada Lovelace' } });
      }
    });

    it('accepts a just-rotated token again within the grace window', async () => {
      const { authService } = createAuthService();
      const { refreshToken } = await registerAda(authService);
      const { refreshToken: currentToken } =
        await authService.refresh(refreshToken);

      await expect(authService.refresh(refreshToken)).resolves.toBeDefined();
      await expect(authService.refresh(currentToken)).resolves.toBeDefined();
    });

    it('does not revive a rotated token after logout of its successor', async () => {
      const { authService } = createAuthService();
      const { refreshToken } = await registerAda(authService);
      const { refreshToken: currentToken } =
        await authService.refresh(refreshToken);

      await authService.logout(currentToken);

      await expect(authService.refresh(refreshToken)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rejects an access token used as a refresh token', async () => {
      const { authService } = createAuthService();
      const { accessToken } = await registerAda(authService);

      await expect(authService.refresh(accessToken)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rejects a missing refresh token', async () => {
      const { authService } = createAuthService();

      await expect(authService.refresh(undefined)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('revokes every token of the session family', async () => {
      const { authService } = createAuthService();
      const { refreshToken } = await registerAda(authService);
      const [firstTab, secondTab] = await Promise.all([
        authService.refresh(refreshToken),
        authService.refresh(refreshToken),
      ]);

      await authService.logout(firstTab.refreshToken);

      await expect(
        authService.refresh(secondTab.refreshToken),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('closes the sockets of the user', async () => {
      const { authService, disconnectedUserIds } = createAuthService();
      const { refreshToken, user } = await registerAda(authService);

      await authService.logout(refreshToken);

      expect(disconnectedUserIds).toEqual([user.id]);
    });

    it('revokes the refresh token', async () => {
      const { authService } = createAuthService();
      const { refreshToken } = await registerAda(authService);

      await authService.logout(refreshToken);

      await expect(authService.refresh(refreshToken)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('does not fail without a refresh token', async () => {
      const { authService } = createAuthService();

      await expect(authService.logout(undefined)).resolves.toBeUndefined();
    });
  });
});
