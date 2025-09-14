import axios, { AxiosError } from 'axios';
import { seedUsers } from '@dans-coding-world/testing-setup';
import { BaseResponse } from '@dans-coding-world/api-types';

if (process.env.NODE_ENV !== 'test') throw new Error('NODE_ENV not in "test"');

describe('GET /api/v1', () => {
  beforeEach(async () => {
    await seedUsers();
  });
  it('should return a message', async () => {
    const res = await axios.get(`/api/v1`);

    expect(res.status).toBe(200);
    expect(res.data).toEqual({ message: 'Welcome to v1 of the api!' });
  });
});

describe('POST /api/v1/auth/login', () => {
  it('should return an access token on valid credentials', async () => {
    const urlSearchParams = new URLSearchParams();
    urlSearchParams.append('email', 'moderator123@gmail.com');
    urlSearchParams.append('password', 'moderator123');

    const res = await axios.post('/api/v1/auth/login', urlSearchParams, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    expect(res.status).toBe(200);
    const { data } = res.data as BaseResponse;
    expect(data).toHaveProperty('message', 'Login successful');
    expect(data).toHaveProperty('accessToken');
    expect(data).toHaveProperty('refreshToken');
    expect(data).toHaveProperty('user');
  });

  it('should return an error message on invalid credentials', async () => {
    const data = new URLSearchParams();
    data.append('email', 'onomatopoeia@gmail.com');
    data.append('password', 'onomatopoeia123');

    try {
      await axios.post('/api/v1/auth/login', data, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
    } catch (err) {
      const error = err as AxiosError;
      expect(error.status).toBe(401);

      const response = error.response?.data as BaseResponse;
      expect(response.error).toHaveProperty(
        'message',
        'Provided credentials are invalid'
      );
    }
  });

  it('should return an error message on wrong password provided', async () => {
    const data = new URLSearchParams();
    data.append('email', 'moderator123@gmail.com');
    data.append('password', 'onomatopoeia123');

    try {
      await axios.post('/api/v1/auth/login', data, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
    } catch (err) {
      const error = err as AxiosError;
      const response = error.response?.data as BaseResponse;
      expect(error.status).toBe(401);
      expect(response.error).toHaveProperty(
        'message',
        'Provided password is wrong'
      );
    }
  });
});
