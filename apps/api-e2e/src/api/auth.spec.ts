import { seedUsers } from '@dans-coding-world/testing-setup';
import { BaseResponse } from '@dans-coding-world/api-types';
import { LoginResponseDto } from '@dans-coding-world/shared-auth-dto';
import { login, renewAuthToken } from '../helper/authentication.js';
import { createErrorResponse } from '../helper/error-response.js';

describe('POST /api/v1/auth/login', () => {
  beforeAll(async () => {
    await seedUsers();
  });
  it('should return an access token on valid credentials', async () => {
    const res = await login('moderator123@gmail.com', 'moderator123');

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
      login('moderator123@gmail.com', 'onomatopoeia123')
    ).rejects.toMatchObject(
      createErrorResponse(401, 'Provided password is wrong')
    );
  });
});

describe('POST api/v1/auth/refresh', () => {
  it('should return an access/refresh token pair on valid refresh token', async () => {
    const loginRes = await login('moderator123@gmail.com', 'moderator123');
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

  // it('should return an error message on an expired token', async () => {
  //   const loginRes = await login('moderator123@gmail.com', 'moderator123');
  //   const { data: loginData } = loginRes.data as BaseResponse;
  //   const { refreshToken } = loginData as LoginResponseDto;

  //   return await expect(renewAuthToken(refreshToken)).rejects.toMatchObject(
  //     createErrorResponse(401, 'Invalid Token')
  //   );
  // });
});
