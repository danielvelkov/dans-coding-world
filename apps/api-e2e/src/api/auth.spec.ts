import { seedUsers, seedRefreshTokens } from '@dans-coding-world/testing-setup';
import { BaseResponse } from '@dans-coding-world/api-types';
import { LoginResponseDto } from '@dans-coding-world/shared-auth-dto';
import { login, renewAuthToken } from '../helper/authentication.js';
import { createErrorResponse } from '../helper/error-response.js';
import { RefreshToken, User } from '@dans-coding-world/prisma-schema';

let users: User[];
let tokens: RefreshToken[];

describe('POST /api/v1/auth/login', () => {
  beforeAll(async () => {
    users = await seedUsers();
  });
  it('should return an access token on valid credentials', async () => {
    const res = await login(users[0].email, users[0].password);

    expect(res.status).toBe(200);
    const { data } = res.data as BaseResponse;
    expect((data as LoginResponseDto).user).not.toHaveProperty('password');
    expect(data).toHaveProperty('message', 'Login successful');
    expect(data).toHaveProperty('accessToken');
    expect(data).toHaveProperty('refreshToken');
    expect(data).toHaveProperty('user');
  });

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
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
        revoked: true,
        userId: userWithRevokedToken.id,
      },
      {
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
        revoked: false,
        userId: userWithValidToken.id,
      },
    ]);
  });

  it('should return an access/refresh token pair on valid refresh token', async () => {
    const loginRes = await login(users[0].email, users[0].password);
    const { data: loginData } = loginRes.data as BaseResponse;
    const { refreshToken } = loginData as LoginResponseDto;

    const refreshRes = await renewAuthToken(refreshToken);

    expect(refreshRes.status).toBe(200);
    const { data: refreshData } = refreshRes.data as BaseResponse;
    expect((refreshData as LoginResponseDto).user).not.toHaveProperty(
      'password'
    );
    expect(refreshData).toHaveProperty(
      'message',
      'New access and refresh token issued'
    );
    expect(refreshData).toHaveProperty('accessToken');
    expect(refreshData).toHaveProperty('refreshToken');
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
