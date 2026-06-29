import type { User } from '@dans-coding-world/prisma-schema';
import type { UserDetail } from '@dans-coding-world/user-data-access';
import { API_ENDPOINTS } from '@dans-coding-world/shared-data-access-api';
import {
  ERROR_CODES,
  TOKEN_CONSTRAINTS,
} from '@dans-coding-world/shared-constants';
import { generateErrorResponseByErrorCode } from '@dans-coding-world/exceptions';
import { generateMockLoginResponse } from '@dans-coding-world/shared-user-testing';
import { test, expect } from '../fixtures/dbFixture';
import { randomSelect as randomItem } from '@dans-coding-world/helpers';
import {
  logout,
  loginAsRandomUser,
  checkIfLoggedIn,
  checkIfLoggedOut,
} from '../helpers/user-login.helper';

test.describe('User session', () => {
  let testUsers: UserDetail[] = [];

  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test.beforeAll(async ({ db }) => {
    const users = (await db.seedUsers({
      users: [],
      options: { useDefaults: true, clearExisting: true },
    })) as User[];
    if (!users?.length) throw new Error('Missing user fixtures');

    testUsers = users;
  });

  test(`login starts a user's session`, async ({ page }) => {
    await loginAsRandomUser(
      page,
      testUsers.filter((u) => u.role !== 'USER'),
    );
    expect(await checkIfLoggedIn(page)).toBe(true);
  });

  test(`logout ends a user's session`, async ({ page }) => {
    await loginAsRandomUser(
      page,
      testUsers.filter((u) => u.role !== 'USER'),
    );
    expect(await checkIfLoggedIn(page)).toBe(true);
    await logout(page);
    expect(await checkIfLoggedOut(page)).toBe(true);
  });

  test.describe('an attempt to refresh user session occurs on navigating to app', () => {
    test('shows loading spinner while refreshing', async ({ page }) => {
      const randomUser = randomItem(testUsers.filter((u) => u.role !== 'USER'));
      const loginResponse = generateMockLoginResponse({ user: randomUser });

      await page.route(`**${API_ENDPOINTS.AUTH.REFRESH}**`, async (route) => {
        // Add delay for spinner to be visible
        await new Promise((r) => setTimeout(r, 200));
        await route.fulfill({ status: 200, json: loginResponse });
      });

      await page.goto('/posts');

      // Spinner visible during delay, then gone
      await expect(page.getByText(/checking your session/i)).toBeVisible();
      await checkIfLoggedIn(page);
      await expect(
        page.getByText(/checking your session/i),
      ).not.toBeInViewport();
    });

    test('logs user in if refresh is successful and he does not have role "USER"', async ({
      page,
    }) => {
      const randomUser = randomItem(testUsers.filter((u) => u.role !== 'USER'));
      const loginResponse = generateMockLoginResponse({ user: randomUser });

      await page.route(`**${API_ENDPOINTS.AUTH.REFRESH}**`, (route) =>
        route.fulfill({ status: 200, json: loginResponse }),
      );

      await page.goto('/posts');
      expect(await checkIfLoggedIn(page)).toBe(true);
      await expect(page.getByText(randomUser.email)).toBeVisible();
      await expect(page.getByRole('link', { name: /login/i })).toBeHidden();
    });

    test('no login occurs if refresh fails', async ({ page }) => {
      await page.route(`**${API_ENDPOINTS.AUTH.REFRESH}**`, (route) =>
        route.fulfill({
          status: 401,
          json: generateErrorResponseByErrorCode(ERROR_CODES.AUTH.UNAUTHORIZED),
        }),
      );

      await page.goto('/');
      await expect(page.getByRole('link', { name: /login/i })).toBeVisible();
      expect(await checkIfLoggedOut(page)).toBe(true);
    });

    test('displays 401 UNAUTHORIZED error if on a route requiring authentication', async ({
      page,
    }) => {
      await page.route(`**${API_ENDPOINTS.AUTH.REFRESH}**`, (route) =>
        route.fulfill({
          status: 401,
          json: generateErrorResponseByErrorCode(ERROR_CODES.AUTH.UNAUTHORIZED),
        }),
      );

      await page.goto('/posts');
      await expect(page.getByText(/401/i)).toBeVisible();
      await expect(page.getByText(/authentication required/i)).toBeVisible();
    });
  });

  test.describe('user session refreshes at a certain interval once logged in', () => {
    test(`logs out user after 10 seconds when on protected route and
       session refresh results in user with role "USER"`, async ({ page }) => {
      await page.clock.install({ time: new Date() });
      const randomUser = randomItem(testUsers.filter((u) => u.role !== 'USER'));
      const updatedLoginResponse = generateMockLoginResponse({
        user: { ...randomUser, role: 'USER' },
      });

      let refreshCount = 0;

      await page.route(`**${API_ENDPOINTS.AUTH.REFRESH}**`, (route) => {
        if (refreshCount > 0)
          return route.fulfill({ status: 200, json: updatedLoginResponse });
        else {
          refreshCount++;
          return route.fulfill({ status: 400 });
        }
      });

      await loginAsRandomUser(page, [randomUser]);
      expect(await checkIfLoggedIn(page)).toBe(true);

      await page.goto('/posts');

      const tokenExpiryInMs = TOKEN_CONSTRAINTS.ACCESS_TOKEN_EXPIRATION + 5000; // add some leeway after expiry

      await page.clock.runFor(tokenExpiryInMs);
      await expect(page.getByText(/403/i)).toBeVisible();
      await expect(page.getByText(/access denied/i)).toBeVisible();
      await page.clock.runFor('00:10'); // ten seconds
      expect(await checkIfLoggedOut(page)).toBe(true);
    });

    test('keeps user logged in on successful refresh', async ({ page }) => {
      await page.clock.install({ time: new Date() });
      // Initial refresh on page load should fail (no session yet)
      const initialRefresh = page.waitForResponse(
        (res) =>
          res.url().includes(API_ENDPOINTS.AUTH.REFRESH) &&
          res.status() === 400,
        { timeout: 10000 },
      );
      await page.goto('/');

      await initialRefresh;

      await loginAsRandomUser(
        page,
        testUsers.filter((u) => u.role !== 'USER'),
        false,
      );
      expect(await checkIfLoggedIn(page)).toBe(true);

      const count = Math.floor(Math.random() * 10) + 1;
      for (let i = 0; i < count; i++) {
        const nextRefresh = page.waitForResponse(
          (res) =>
            res.url().includes(API_ENDPOINTS.AUTH.REFRESH) &&
            res.status() === 200,
        );
        await page.clock.fastForward(
          TOKEN_CONSTRAINTS.ACCESS_TOKEN_EXPIRATION + 1000,
        );
        await nextRefresh;
        expect(await checkIfLoggedIn(page)).toBe(true);
      }
    });

    test('logs user out on unsuccessful refresh', async ({ page }) => {
      await page.clock.install({ time: new Date() });
      // Initial load refresh fails (no session)
      const initialRefresh = page.waitForResponse(
        (res) =>
          res.url().includes(API_ENDPOINTS.AUTH.REFRESH) &&
          res.status() === 400,
        { timeout: 10000 },
      );
      await page.goto('/');

      await initialRefresh;

      await loginAsRandomUser(
        page,
        testUsers.filter((u) => u.role !== 'USER'),
        false,
      );
      expect(await checkIfLoggedIn(page)).toBe(true);

      // After login, intercept next refresh and make it fail
      await page.route(`**${API_ENDPOINTS.AUTH.REFRESH}**`, async (route) => {
        await route.fulfill({
          status: 400,
          json: generateErrorResponseByErrorCode(
            ERROR_CODES.AUTH.INVALID_TOKEN,
          ),
        });
      });

      const fiveSecondsBeforeExpiryInMs =
        TOKEN_CONSTRAINTS.ACCESS_TOKEN_EXPIRATION - 5000;

      await page.clock.runFor(fiveSecondsBeforeExpiryInMs);
      expect(await checkIfLoggedIn(page)).toBe(true);
      await page.clock.runFor(10000); // 10 seconds after
      expect(await checkIfLoggedOut(page)).toBe(true);
    });

    test('clears session refresh interval after logout', async ({ page }) => {
      await page.clock.install({ time: new Date() });

      // Initial load refresh fails (no session)
      const initialRefresh = page.waitForResponse(
        (res) =>
          res.url().includes(API_ENDPOINTS.AUTH.REFRESH) &&
          res.status() === 400,
        { timeout: 10000 },
      );
      await page.goto('/');
      await initialRefresh;

      let sessionRefreshCount = 0;
      await page.route(`**${API_ENDPOINTS.AUTH.REFRESH}**`, async (route) => {
        sessionRefreshCount++;
        await route.continue();
      });

      await loginAsRandomUser(
        page,
        testUsers.filter((u) => u.role !== 'USER'),
        false,
      );
      expect(await checkIfLoggedIn(page)).toBe(true);

      await logout(page);

      const arbitraryAmountOfTimeAfterExpiration =
        TOKEN_CONSTRAINTS.ACCESS_TOKEN_EXPIRATION * 5 + 1000;
      await page.clock.fastForward(arbitraryAmountOfTimeAfterExpiration);

      // Should not have called refresh route
      expect(sessionRefreshCount).toBe(0);
      expect(await checkIfLoggedOut(page)).toBe(true);
    });
  });

  test('user session is kept after reloading page', async ({ page }) => {
    await loginAsRandomUser(
      page,
      testUsers.filter((u) => u.role !== 'USER'),
    );
    expect(await checkIfLoggedIn(page)).toBe(true);

    await page.reload({ waitUntil: 'networkidle' });
    expect(await checkIfLoggedIn(page)).toBe(true);
  });

  test('user session is kept when navigating to a different path', async ({
    page,
  }) => {
    await loginAsRandomUser(page, testUsers);
    expect(await checkIfLoggedIn(page)).toBe(true);

    await page.goto('/posts');
    expect(await checkIfLoggedIn(page)).toBe(true);
  });
});
