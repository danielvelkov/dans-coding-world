import { CookieJar } from 'tough-cookie';
import axios from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { User } from '@dans-coding-world/prisma-schema';
import { createAuthRouteHelper } from './auth-request.helper';
import { ApiClient, BASE_URL } from '@dans-coding-world/shared-data-access-api';

/**
 * Generates a new api client for individual test use. It has no saved cookies.
 * @returns New api client with no cookie history.
 */
export function createApiClient() {
  const jar = new CookieJar();

  // Create a new api client instance (not the global one)
  const api = new ApiClient(
    wrapper(
      axios.create({
        baseURL: BASE_URL,
        jar: jar,
        withCredentials: true,
      })
    )
  );

  return api;
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
  routeHelperFactory: (client: ApiClient) => any,
  user?: User
): Promise<any> => {
  const client = createApiClient();

  if (user) {
    const { login } = createAuthRouteHelper(client);
    await login(user.email, user.password);
  }

  return routeHelperFactory(client);
};
