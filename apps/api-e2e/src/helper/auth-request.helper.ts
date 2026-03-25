import {
  ApiClient,
  API_ENDPOINTS,
} from '@dans-coding-world/shared-data-access-api';
import { AxiosResponse } from 'axios';
import { decode, JwtPayload } from 'jsonwebtoken';
import { REFRESH_TOKEN_COOKIE } from '@dans-coding-world/shared-constants';

export function createAuthRouteHelper(client: ApiClient) {
  return {
    register(email: string, password: string, username: string) {
      const urlSearchParams = new URLSearchParams();
      urlSearchParams.append('email', email);
      urlSearchParams.append('password', password);
      urlSearchParams.append('username', username);

      return client.post(API_ENDPOINTS.AUTH.REGISTER, urlSearchParams, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
    },

    /**
     * Logs with credentials into to the API, which in turn
     * stores the tokens needed for auth in SET-COOKIE header of the axios client.
     * @param email User email
     * @param password User pass
     * @returns Login response
     * @throws {Error} When login fails
     */
    login(email: string, password: string) {
      const urlSearchParams = new URLSearchParams();
      urlSearchParams.append('email', email);
      urlSearchParams.append('password', password);

      return client.post(API_ENDPOINTS.AUTH.LOGIN, urlSearchParams, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
    },

    logout() {
      return client.post(API_ENDPOINTS.AUTH.LOGOUT);
    },

    renewAuthToken(token: string) {
      if (token)
        return client.post(
          API_ENDPOINTS.AUTH.REFRESH,
          {},
          {
            headers: {
              Cookie: `${REFRESH_TOKEN_COOKIE}=${token}`,
            },
            withCredentials: true,
          }
        );
      return client.post(API_ENDPOINTS.AUTH.REFRESH);
    },

    revokeToken(token: string) {
      const urlSearchParams = new URLSearchParams();
      urlSearchParams.append('token', token);

      return client.post(API_ENDPOINTS.AUTH.REVOKE, urlSearchParams, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
    },

    revokeAllTokens() {
      return client.post(API_ENDPOINTS.AUTH.REVOKE_ALL);
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
