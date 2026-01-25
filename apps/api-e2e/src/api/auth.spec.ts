import {
  getTokenById,
  seedRefreshTokens,
  seedUsers,
  updateRefreshToken,
} from '@dans-coding-world/testing-setup';
import { BaseResponse } from '@dans-coding-world/api-types';
import {
  LoginResponseDto,
  RegistrationResponseDto,
} from '@dans-coding-world/shared-auth-dto';
import {
  createAuthRouteHelper,
  findSetCookie,
  getJti,
  getJwtToken,
} from '../helper/auth-request.helper.js';
import { createApiClient } from '../helper/test-client.helper.js';
import {
  createErrorCodeResponse,
  createValidationErrorResponse,
} from '../helper/error-response.helper.js';
import { User, client as prisma } from '@dans-coding-world/prisma-schema';
import {
  USER_CONSTRAINTS,
  VALIDATION_MESSAGES,
  SUCCESS_MESSAGES,
  ERROR_CODES,
  REFRESH_TOKEN_COOKIE,
  ACCESS_TOKEN_COOKIE,
} from '@dans-coding-world/shared-constants';
import { passwordGenerator } from '@dans-coding-world/helpers';
import { IS_EMAIL, MIN_LENGTH, MATCHES } from 'class-validator';
import {
  ApiClient,
  API_ENDPOINTS,
} from '@dans-coding-world/shared-data-access-api';

let users: User[];

describe('/api/v1/auth', () => {
  let client: ApiClient;
  let login: (email: string, password: string) => Promise<BaseResponse>;
  let logout: () => Promise<BaseResponse>;
  let renewAuthToken: (token: string) => Promise<BaseResponse>;
  let register: (
    email: string,
    password: string,
    username: string
  ) => Promise<BaseResponse>;
  let revokeToken: (token: string) => Promise<BaseResponse>;
  let revokeAllTokens: () => Promise<BaseResponse>;

  beforeEach(() => {
    client = createApiClient();
    ({ login, logout, renewAuthToken, register, revokeToken, revokeAllTokens } =
      createAuthRouteHelper(client));
  });

  afterAll(async () => {
    // Cleanup
    await seedUsers([], { clearExisting: true, useDefaults: false });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeAll(async () => {
      users = await seedUsers();
    });

    it(`should return user data and set access and refresh tokens
       in 'Set-Cookie' header on valid credentials`, async () => {
      const res = await client.request(API_ENDPOINTS.AUTH.LOGIN, {
        data: { email: users[0].email, password: users[0].password },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        method: 'POST',
      });

      expect(res.status).toBe(200);
      const { data } = res.data as BaseResponse;
      expect((data as LoginResponseDto).user).not.toHaveProperty('password');
      expect(data).toHaveProperty('message', SUCCESS_MESSAGES.AUTH.login);

      const refreshTokenCookie = findSetCookie(res, REFRESH_TOKEN_COOKIE);
      const accessTokenCookie = findSetCookie(res, ACCESS_TOKEN_COOKIE);

      expect(getJwtToken(refreshTokenCookie)).toBeTruthy();
      expect(getJwtToken(accessTokenCookie)).toBeTruthy();

      expect(accessTokenCookie).toContain('HttpOnly');
      expect(refreshTokenCookie).toContain('HttpOnly');
    });

    test.each([
      ['', ''],
      ['user123@email.com', ''],
      ['', 'password123'],
    ])(
      'should return an error message on missing required fields',
      async ([username, password]) => {
        await expect(login(username, password)).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.VALIDATION.VALIDATION_ERROR)
        );
      }
    );

    it('should return an error message on invalid credentials', async () => {
      await expect(
        login('onomatopoeia@gmail.com', 'onomatopoeia123')
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.AUTH.INVALID_CREDENTIALS)
      );
    });

    it('should return an error message on wrong password provided', async () => {
      await expect(
        login(users[0].email, 'onomatopoeia123')
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.AUTH.INVALID_PASSWORD)
      );
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    beforeAll(async () => {
      users = await seedUsers();
    });

    it('should remove token data from set-cookie when logout successful', async () => {
      await client.request(API_ENDPOINTS.AUTH.LOGIN, {
        data: { email: users[0].email, password: users[0].password },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        method: 'POST',
      });

      const logoutRes = await client.request(API_ENDPOINTS.AUTH.LOGOUT, {
        method: 'POST',
      });

      const { data } = logoutRes.data as BaseResponse;
      expect(logoutRes.status).toBe(200);
      expect(data).toHaveProperty('message', SUCCESS_MESSAGES.AUTH.logout);

      expect(() =>
        getJwtToken(findSetCookie(logoutRes, ACCESS_TOKEN_COOKIE))
      ).toThrow();
      expect(() =>
        getJwtToken(findSetCookie(logoutRes, REFRESH_TOKEN_COOKIE))
      ).toThrow();
    });

    it('should revoke user refresh token when logout successful', async () => {
      const res = await client.request(API_ENDPOINTS.AUTH.LOGIN, {
        data: { email: users[0].email, password: users[0].password },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        method: 'POST',
      });

      await client.request(API_ENDPOINTS.AUTH.LOGOUT, {
        method: 'POST',
      });

      const jti = getJti(getJwtToken(findSetCookie(res, REFRESH_TOKEN_COOKIE)));

      const token = await getTokenById(jti);
      expect(token.revoked).toBe(true);
    });
    it('should return 401 Unauthorized when trying to access as a logged out user', async () => {
      return await expect(logout).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.AUTH.UNAUTHORIZED)
      );
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    let jwt = '';

    beforeAll(async () => {
      users = await seedUsers();
    });

    beforeEach(async () => {
      if (!users[0]) throw new Error('Missing test user');

      const res = await client.request(API_ENDPOINTS.AUTH.LOGIN, {
        data: { email: users[0].email, password: users[0].password },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        method: 'POST',
      });

      const refreshTokenCookie = findSetCookie(res, REFRESH_TOKEN_COOKIE);

      jwt = getJwtToken(refreshTokenCookie);
    });

    it('should set new access and refresh token in set-cookie header on valid refresh token', async () => {
      const refreshRes = await client.request(API_ENDPOINTS.AUTH.REFRESH, {
        data: { token: jwt },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        method: 'POST',
      });

      const newRefreshTokenCookie = findSetCookie(
        refreshRes,
        REFRESH_TOKEN_COOKIE
      );
      const newAccessTokenCookie = findSetCookie(
        refreshRes,
        ACCESS_TOKEN_COOKIE
      );

      expect(getJwtToken(newRefreshTokenCookie)).toBeTruthy();
      expect(getJwtToken(newAccessTokenCookie)).toBeTruthy();

      expect(jwt).not.toBe(getJwtToken(newRefreshTokenCookie));

      expect(newAccessTokenCookie).toContain('HttpOnly');
      expect(newRefreshTokenCookie).toContain('HttpOnly');

      expect(refreshRes.status).toBe(200);
      const { data: refreshData } = refreshRes.data as BaseResponse;
      expect((refreshData as LoginResponseDto).user).not.toHaveProperty(
        'password'
      );
      expect(refreshData).toHaveProperty(
        'message',
        SUCCESS_MESSAGES.AUTH.token
      );
      expect(refreshData).toHaveProperty('user');
    });

    it('should return validation error message if string is not JWT token', async () => {
      return await expect(
        renewAuthToken('123.12312.123.3123')
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.VALIDATION.VALIDATION_ERROR)
      );
    });

    test.each([
      [
        'token expiring last minute',
        {
          expiresAt: new Date(Date.now() - 1000 * 60),
        },
      ],
      [
        'token being revoked',
        {
          revoked: true,
        },
      ],
      [
        'token changing users',
        {
          userId: 2,
        },
      ],
    ])(
      'should return invalid token error message on %s',
      async (_, tokenUpdateData) => {
        await updateRefreshToken({ ...tokenUpdateData, jti: getJti(jwt) });
        return await expect(renewAuthToken(jwt)).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.AUTH.INVALID_TOKEN)
        );
      }
    );
  });

  describe('POST /api/v1/auth/register', () => {
    const VALID_USER_DATA = {
      email: 'totalyValidEmail@gmail.com',
      password: passwordGenerator(USER_CONSTRAINTS.MIN_PASSWORD_LENGTH + 1),
      username: 'totallyValid13',
    };

    beforeAll(async () => {
      // cleanup
      await seedUsers([], { clearExisting: true, useDefaults: false });
    });

    it('should return created user data on valid registration data', async () => {
      const { data } = await register(
        VALID_USER_DATA.email,
        VALID_USER_DATA.password,
        VALID_USER_DATA.username
      );

      expect((data as RegistrationResponseDto).user).not.toHaveProperty(
        'password'
      );
      expect(data).toHaveProperty('message', SUCCESS_MESSAGES.AUTH.register);

      const { data: loginData } = await login(
        VALID_USER_DATA.email,
        VALID_USER_DATA.password
      );

      expect(loginData).toHaveProperty('message', SUCCESS_MESSAGES.AUTH.login);
    });

    it('should return an error when trying to register an existing user with the same username or email', async () => {
      await seedUsers(
        [{ ...VALID_USER_DATA, id: 1, role: 'USER', isBanned: false }],
        {
          clearExisting: true,
          useDefaults: false,
        }
      );

      // Same username
      await expect(
        register(
          'mockEmail13@gmail.com',
          VALID_USER_DATA.password,
          VALID_USER_DATA.username
        )
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.VALIDATION.USER_EXISTS)
      );

      // Same email
      await expect(
        register(
          VALID_USER_DATA.email,
          VALID_USER_DATA.password,
          'veryCoolUser13'
        )
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.VALIDATION.USER_EXISTS)
      );
    });

    test.each([
      [
        'email is empty',
        'username123',
        passwordGenerator(USER_CONSTRAINTS.MIN_PASSWORD_LENGTH + 1),
        '',
        'email',
        { [IS_EMAIL]: VALIDATION_MESSAGES.email.invalidEmail },
      ],
      [
        'email is invalid',
        'username123',
        passwordGenerator(USER_CONSTRAINTS.MIN_PASSWORD_LENGTH + 1),
        'invalid-email',
        'email',
        { [IS_EMAIL]: VALIDATION_MESSAGES.email.invalidEmail },
      ],
      [
        'username is empty',
        '',
        passwordGenerator(USER_CONSTRAINTS.MIN_PASSWORD_LENGTH + 1),
        'valid@email.com',
        'username',
        {
          [MIN_LENGTH]: VALIDATION_MESSAGES.minLength(
            USER_CONSTRAINTS.MIN_USERNAME_LENGTH
          ),
        },
      ],
      [
        'username is too short',
        'us',
        passwordGenerator(USER_CONSTRAINTS.MIN_PASSWORD_LENGTH + 1),
        'valid@email.com',
        'username',
        {
          [MIN_LENGTH]: VALIDATION_MESSAGES.minLength(
            USER_CONSTRAINTS.MIN_USERNAME_LENGTH
          ),
        },
      ],
      [
        'username is not alphanumeric',
        'username@123',
        passwordGenerator(USER_CONSTRAINTS.MIN_PASSWORD_LENGTH + 1),
        'valid@email.com',
        'username',
        {
          [MATCHES]: VALIDATION_MESSAGES.username.invalid,
        },
      ],
      [
        'password is empty',
        'username123',
        '',
        'valid@email.com',
        'password',
        {
          [MIN_LENGTH]: VALIDATION_MESSAGES.minLength(
            USER_CONSTRAINTS.MIN_PASSWORD_LENGTH
          ),
        },
      ],
      [
        'password is too short',
        'username123',
        passwordGenerator(USER_CONSTRAINTS.MIN_USERNAME_LENGTH - 1),
        'valid@email.com',
        'password',
        {
          [MIN_LENGTH]: VALIDATION_MESSAGES.minLength(
            USER_CONSTRAINTS.MIN_PASSWORD_LENGTH
          ),
        },
      ],
    ])(
      'should return validation error when %s',
      async (_, username, password, email, property, constraints) => {
        await expect(register(email, password, username)).rejects.toMatchObject(
          createValidationErrorResponse([{ field: property, constraints }])
        );
      }
    );
  });

  describe('POST /api/v1/auth/revoke-token', () => {
    let userRefreshToken = '';

    beforeAll(async () => {
      users = await seedUsers();
    });

    beforeEach(async () => {
      if (!users[0]) throw new Error('Missing test user');

      const res = await client.request(API_ENDPOINTS.AUTH.LOGIN, {
        data: { email: users[0].email, password: users[0].password },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        method: 'POST',
      });

      const refreshTokenCookie = findSetCookie(res, REFRESH_TOKEN_COOKIE);

      userRefreshToken = getJwtToken(refreshTokenCookie);
    });

    it('should return 401 Unauthorized when trying to access as a logged out user', async () => {
      await logout();

      return await expect(revokeToken(userRefreshToken)).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.AUTH.UNAUTHORIZED)
      );
    });

    it('should return 403 forbidden when trying to access as a user', async () => {
      const user = users.find((u) => u.role === 'USER');
      if (!user) throw new Error('Missing test user');

      await login(user.email, user.password);
      return await expect(revokeToken(userRefreshToken)).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.FORBIDDEN)
      );
    });

    it('should mark token as "revoked" in the db', async () => {
      expect((await getTokenById(getJti(userRefreshToken))).revoked).toBe(
        false
      );
      const admin = users.find((u) => u.role === 'ADMIN');
      if (!admin) throw new Error('Missing test user');

      await login(admin.email, admin.password);
      const { data } = await revokeToken(userRefreshToken);

      expect(data).toHaveProperty('message', SUCCESS_MESSAGES.AUTH.revoke);
      const updatedToken = await getTokenById(getJti(userRefreshToken));
      expect(updatedToken.revoked).toBe(true);
    });

    it(`should return error when logged-in user is banned and trying to
      access endpoint`, async () => {
      const mod = users.find((u) => u.role === 'MOD');
      const user = users.find((u) => u.role === 'USER');
      if (!mod || !user) throw new Error('Missing test user');

      await prisma.user.update({
        where: {
          id: mod.id,
        },
        data: {
          isBanned: true,
        },
      });
      await login(mod.email, mod.password);
      await expect(revokeToken(userRefreshToken)).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.AUTH.BANNED)
      );
      await prisma.user.update({
        where: {
          id: mod.id,
        },
        data: {
          isBanned: false,
        },
      });
    });

    it('should throw when token does not exist', async () => {
      // clear tokens
      await seedRefreshTokens([], { clearExisting: true, useDefaults: false });
      return await expect(revokeToken(userRefreshToken)).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.AUTH.TOKEN_NOT_FOUND)
      );
    });
  });

  describe('POST /api/v1/auth/revoke-all', () => {
    let tokens: string[] = [];

    beforeEach(async () => {
      // Cleanup
      users = await seedUsers();
      tokens = [];

      for (const u of users) {
        const res = await client.request(API_ENDPOINTS.AUTH.LOGIN, {
          data: { email: u.email, password: u.password },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          method: 'POST',
        });

        const refreshTokenCookie = findSetCookie(res, REFRESH_TOKEN_COOKIE);

        tokens.push(getJwtToken(refreshTokenCookie));
      }
    });

    it('should return 401 Unauthorized when trying to access as a logged out user', async () => {
      const user = users.find((u) => u.role === 'USER');
      if (!user) throw new Error('Missing test user');

      await login(user.email, user.password);
      await logout();

      return await expect(revokeAllTokens).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.AUTH.UNAUTHORIZED)
      );
    });

    it('should return 403 forbidden when trying to access as anything other than admin', async () => {
      const user = users.find((u) => u.role === 'USER');
      if (!user) throw new Error('Missing test user');

      const moderator = users.find((u) => u.role === 'MOD');
      if (!moderator) throw new Error('Missing test user');

      expect.assertions(2);

      await login(user.email, user.password);
      await expect(revokeAllTokens).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.FORBIDDEN)
      );

      await login(moderator.email, moderator.password);
      await expect(revokeAllTokens).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.FORBIDDEN)
      );
    });

    it('should mark all tokens as revoked if called as admin', async () => {
      for (const token of tokens) {
        expect((await getTokenById(getJti(token))).revoked).toBe(false);
      }

      const admin = users.find((u) => u.role === 'ADMIN');
      if (!admin) throw new Error('Missing test user');

      await login(admin.email, admin.password);
      const res = await revokeAllTokens();

      const { data: revokeData } = res;
      if (!revokeData) throw new Error('Missing data');

      expect(revokeData).toHaveProperty(
        'message',
        SUCCESS_MESSAGES.AUTH.revoke
      );
      expect(revokeData).toHaveProperty('revokedCount', tokens.length + 1); // +1 because admin logged in
      for (const token of tokens) {
        const updatedToken = await getTokenById(getJti(token));
        expect(updatedToken.revoked).toBe(true);
      }
    });
  });
});
