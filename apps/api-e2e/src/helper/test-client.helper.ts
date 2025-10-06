import { CookieJar } from 'tough-cookie';
import axios from 'axios';
import { wrapper } from 'axios-cookiejar-support';

/**
 * Generates a new axios client for individual test use. It has no saved cookies.
 * @returns New axios client with no cookie history.
 */
export function createAxiosClient() {
  const host = process.env.HOST ?? 'localhost';
  const port = process.env.PORT ?? '3000';

  const jar = new CookieJar();

  // Create a new axios instance (not the global one)
  const client = wrapper(
    axios.create({
      baseURL: `http://${host}:${port}`,
      jar: jar,
      withCredentials: true,
    })
  );

  return client;
}
