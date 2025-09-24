import { seedUsers, seedRefreshTokens } from '@dans-coding-world/testing-setup';
import { BaseResponse } from '@dans-coding-world/api-types';
import { LoginResponseDto } from '@dans-coding-world/shared-auth-dto';
import {
  login,
  renewAuthToken,
  findSetCookie,
  getJwtToken,
} from '../helper/authentication.js';
import { createErrorResponse } from '../helper/error-response.js';
import { RefreshToken, User } from '@dans-coding-world/prisma-schema';
import { TOKEN_CONSTRAINTS } from '@dans-coding-world/shared-constants';

let users: User[];
let tokens: RefreshToken[];

describe('/api/v1/auth', () => {
  afterAll(async () => {
    // Cleanup
    await seedUsers([], { clearExisting: true, useDefaults: false });
    await seedRefreshTokens([], { clearExisting: true, useDefaults: false });
  });
  describe('POST /api/v1/auth/login', () => {
    beforeAll(async () => {
      users = await seedUsers();
    });
    it(`should return user data and set access and refresh tokens
       in 'Set-Cookie' header on valid credentials`, async () => {
      const res = await login(users[0].email, users[0].password);

      expect(res.status).toBe(200);
      const { data } = res.data as BaseResponse;
      expect((data as LoginResponseDto).user).not.toHaveProperty('password');
      expect(data).toHaveProperty('message', 'Login successful');

      const refreshTokenCookie = findSetCookie(res, 'refresh_token');
      const accessTokenCookie = findSetCookie(res, 'access_token');

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
          createErrorResponse(400, 'Validation failed')
        );
      }
    );

    it('should return an error message on invalid credentials', async () => {
      await expect(
        login('onomatopoeia@gmail.com', 'onomatopoeia123')
      ).rejects.toMatchObject(
        createErrorResponse(401, 'Provided credentials are invalid')
      );
    });

    it('should return an error message on wrong password provided', async () => {
      await expect(
        login(users[0].email, 'onomatopoeia123')
      ).rejects.toMatchObject(
        createErrorResponse(401, 'Provided password is wrong')
      );
    });
  });

  describe('POST api/v1/auth/refresh', () => {
    let userWithExpiredToken: User,
      userWithRevokedToken: User,
      userWithValidToken: User;

    beforeAll(async () => {
      users = await seedUsers();
      [userWithExpiredToken, userWithRevokedToken, userWithValidToken] = users;
      tokens = await seedRefreshTokens([
        {
          expiresAt: new Date(Date.now() - 1000 * 60),
          revoked: false,
          userId: userWithExpiredToken.id,
        },
        {
          expiresAt: new Date(
            Date.now() + TOKEN_CONSTRAINTS.REFRESH_TOKEN_EXPIRATION
          ),
          revoked: true,
          userId: userWithRevokedToken.id,
        },
        {
          expiresAt: new Date(
            Date.now() + TOKEN_CONSTRAINTS.REFRESH_TOKEN_EXPIRATION
          ),
          revoked: false,
          userId: userWithValidToken.id,
        },
      ]);
    });

    it('should set new access and refresh token in set-cookie header on valid refresh token', async () => {
      const loginRes = await login(users[0].email, users[0].password);

      const accessTokenCookie = findSetCookie(loginRes, 'access_token');
      const refreshTokenCookie = findSetCookie(loginRes, 'refresh_token');

      const accessToken = getJwtToken(accessTokenCookie);
      const refreshToken = getJwtToken(refreshTokenCookie);

      const refreshRes = await renewAuthToken(refreshToken);

      const newRefreshTokenCookie = findSetCookie(refreshRes, 'refresh_token');
      const newAccessTokenCookie = findSetCookie(refreshRes, 'access_token');

      expect(getJwtToken(newRefreshTokenCookie)).toBeTruthy();
      expect(getJwtToken(newAccessTokenCookie)).toBeTruthy();

      expect(accessToken).not.toBe(getJwtToken(newAccessTokenCookie));
      expect(refreshToken).not.toBe(getJwtToken(newRefreshTokenCookie));

      expect(newAccessTokenCookie).toContain('HttpOnly');
      expect(newRefreshTokenCookie).toContain('HttpOnly');

      expect(refreshRes.status).toBe(200);
      const { data: refreshData } = refreshRes.data as BaseResponse;
      expect((refreshData as LoginResponseDto).user).not.toHaveProperty(
        'password'
      );
      expect(refreshData).toHaveProperty(
        'message',
        'New access and refresh token issued'
      );
      expect(refreshData).toHaveProperty('user');
    });

    it('should return an access/refresh token pair on valid refresh token (entry already in db)', async () => {
      const validTokenObj = tokens.find(
        (t) => t.userId === userWithValidToken.id
      );

      if (!validTokenObj) throw new Error('Missing test user');
      const refreshRes = await renewAuthToken(validTokenObj.token);

      expect(refreshRes.status).toBe(200);
      const { data: refreshData } = refreshRes.data as BaseResponse;
      expect(refreshData).toHaveProperty(
        'message',
        'New access and refresh token issued'
      );
    });

    it('should return validation error message if string is not JWT token', async () => {
      return await expect(
        renewAuthToken('123.12312.123.3123')
      ).rejects.toMatchObject(createErrorResponse(400, 'Validation failed'));
    });

    it('should return an error message on an expired token', async () => {
      const expiredTokenObj = tokens.find(
        (t) => t.userId === userWithExpiredToken.id
      );
      if (!expiredTokenObj) throw new Error('Missing test user');

      return await expect(
        renewAuthToken(expiredTokenObj.token)
      ).rejects.toMatchObject(
        createErrorResponse(401, 'Invalid or expired token.')
      );
    });

    it('should return an error message on a revoked token', async () => {
      const revokedTokenObj = tokens.find(
        (t) => t.userId === userWithRevokedToken.id
      );
      if (!revokedTokenObj) throw new Error('Missing test user');

      return await expect(
        renewAuthToken(revokedTokenObj.token)
      ).rejects.toMatchObject(
        createErrorResponse(401, 'Invalid or expired token.')
      );
    });
  });
});
