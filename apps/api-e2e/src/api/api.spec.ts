import axios, { AxiosError } from 'axios';
import { seedUsers } from '@dans-coding-world/testing-setup';

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
    const data = new URLSearchParams();
    data.append('email', 'moderator123@gmail.com');
    data.append('password', 'moderator123');

    const res = await axios.post('/api/v1/auth/login', data, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty('message', 'Login successful');
    expect(res.data).toHaveProperty('accessToken');
    expect(res.data).toHaveProperty('refreshToken');
    expect(res.data).toHaveProperty('user');
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
      expect(error.response?.data).toHaveProperty(
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
      expect(error.status).toBe(401);
      expect(error.response?.data).toHaveProperty(
        'message',
        'Provided password is wrong'
      );
    }
  });
});
