import { AxiosInstance, AxiosResponse } from 'axios';
import { decode, JwtPayload } from 'jsonwebtoken';

export function createAuthRouteHelper(client: AxiosInstance) {
  return {
    async register(email: string, password: string, username: string) {
      const urlSearchParams = new URLSearchParams();
      urlSearchParams.append('email', email);
      urlSearchParams.append('password', password);
      urlSearchParams.append('username', username);

      return await client.post('/api/v1/auth/register', urlSearchParams, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
    },

    async login(email: string, password: string) {
      const urlSearchParams = new URLSearchParams();
      urlSearchParams.append('email', email);
      urlSearchParams.append('password', password);

      return await client.post('/api/v1/auth/login', urlSearchParams, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
    },

    async logout() {
      return await client.post('/api/v1/auth/logout');
    },

    async renewAuthToken(token: string) {
      const urlSearchParams = new URLSearchParams();
      urlSearchParams.append('token', token);

      return await client.post('/api/v1/auth/refresh', urlSearchParams, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
    },

    async revokeToken(token: string) {
      const urlSearchParams = new URLSearchParams();
      urlSearchParams.append('token', token);

      return await client.post('/api/v1/auth/revokeToken', urlSearchParams, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
    },

    async revokeAllTokens() {
      return await client.post('/api/v1/auth/revokeAll');
    },
  };
}

// Keep utility functions separate (they don't need the client)
export function findSetCookie(res: AxiosResponse, key: string) {
  const setCookieHeader = res.headers['set-cookie'];
  if (!setCookieHeader)
    throw new Error('Missing "Set-Cookie" header in response');

  const result = setCookieHeader.find((cookie) => cookie.startsWith(`${key}=`));

  if (!result)
    throw new Error(`'${key}' is not present in 'Set-Cookie' header`);

  return result;
}

export function getJwtToken(string: string) {
  const match = string.match(/=([\w-]+\.[\w-]+\.[\w-]+);/);
  if (!match?.[1]) throw new Error('Missing refresh token');
  return match[1];
}

export const getJti = (token: string) => {
  const payload: JwtPayload = decode(token) as JwtPayload;
  if (!payload.jti) throw new Error('Missing jti');
  return payload.jti;
};
