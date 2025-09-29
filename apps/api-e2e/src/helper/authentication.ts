import axios, { AxiosResponse } from 'axios';
import { decode, JwtPayload } from 'jsonwebtoken';

export async function register(
  email: string,
  password: string,
  username: string
) {
  const urlSearchParams = new URLSearchParams();
  urlSearchParams.append('email', email);
  urlSearchParams.append('password', password);
  urlSearchParams.append('username', username);

  return await axios.post('/api/v1/auth/register', urlSearchParams, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
}

export async function login(email: string, password: string) {
  const urlSearchParams = new URLSearchParams();
  urlSearchParams.append('email', email);
  urlSearchParams.append('password', password);

  return await axios.post('/api/v1/auth/login', urlSearchParams, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
}

export async function renewAuthToken(token: string) {
  const urlSearchParams = new URLSearchParams();
  urlSearchParams.append('token', token);

  return await axios.post('/api/v1/auth/refresh', urlSearchParams, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
}

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
