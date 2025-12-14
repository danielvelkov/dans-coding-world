import { CookieJar } from 'tough-cookie';
import axios, { AxiosInstance } from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { User } from '@dans-coding-world/prisma-schema';
import { createAuthRouteHelper } from './auth-request.helper';

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
/**
 * Creates a test client, performs authentication (if a user is provided),
 * and wraps it in the specified route helper.
 *
 * @param routeHelperFactory - The factory function that creates the specific route helper (e.g., `createUsersRouteHelper`).
 * @param user - (Optional) The user entity to log in as. If omitted, the client performs as an anonymous user.
 * @returns A promise resolving to the initialized route helper (e.g., `UserHelpers`, `AuthHelpers`).
 */
export const setupClient = async (
  routeHelperFactory: (client: AxiosInstance) => any,
  user?: User
): Promise<any> => {
  const client = createAxiosClient();

  if (user) {
    const { login } = createAuthRouteHelper(client);
    await login(user.email, user.password);
  }

  return routeHelperFactory(client);
};
