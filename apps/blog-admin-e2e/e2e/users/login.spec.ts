import type { UserDetail } from '@dans-coding-world/user-data-access';
import { API_ENDPOINTS } from '@dans-coding-world/shared-data-access-api';
import { randomSelect as randomItem } from '@dans-coding-world/helpers';
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from '@dans-coding-world/shared-constants';
import { test, expect } from '../fixtures/dbFixture';
import {
  login,
  checkIfLoggedIn,
  checkIfLoggedOut,
} from '../helpers/user-login.helper';

test.describe('User - login', () => {
  let testUsers: UserDetail[] = [];

  test.beforeAll(async ({ db }) => {
    const users = await db.seedUsers({
      users: [],
      options: { useDefaults: true, clearExisting: true },
    });
    if (!users?.length) throw new Error('Missing user fixtures');

    testUsers = users;
  });

  test.describe('Login page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login');
    });

    test('on valid login, the server returns access and refresh tokens as HTTP-only cookies in "Set-Cookie" header', async ({
      page,
    }) => {
      const randomUser = randomItem(testUsers);

      const responsePromise = page.waitForResponse(
        (res) =>
          res.url().includes(API_ENDPOINTS.AUTH.LOGIN) &&
          res.request().method() === 'POST',
      );

      await login(page, randomUser.email, randomUser.password);

      const response = await responsePromise;
      const headers = response.headers();
      const rawCookies = headers['set-cookie'] ?? '';

      const cookieList = rawCookies
        .split('\n')
        .map((c) => c.trim())
        .filter(Boolean);

      const hasAuthCookie = cookieList.some(
        (c) =>
          c.startsWith(ACCESS_TOKEN_COOKIE) ||
          c.startsWith(REFRESH_TOKEN_COOKIE),
      );
      const allHttpOnly = cookieList.every((c) =>
        c.toLowerCase().includes('httponly'),
      );

      expect(hasAuthCookie).toBe(true);
      expect(allHttpOnly).toBe(true);
    });

    test(`on login shows 403 FORBIDDEN page and waits 10 seconds before logging out user,
       if his role is "USER`, async ({ page }) => {
      await page.clock.install({ time: new Date() });
      const user = randomItem(testUsers.filter((u) => u.role === 'USER'));
      await login(page, user.email, user.password);

      await expect(page.getByText(/403/i)).toBeVisible();
      await expect(page.getByText(/access denied/i)).toBeVisible();

      expect(await checkIfLoggedIn(page)).toBe(true);
      await page.clock.runFor('00:10'); // 10 seconds
      expect(await checkIfLoggedOut(page)).toBe(true);
    });

    test('navigates to /posts on login if user has role diff than "USER"', async ({
      page,
    }) => {
      const randomUser = randomItem(testUsers.filter((u) => u.role !== 'USER'));
      await login(page, randomUser.email, randomUser.password);
      await expect(page).toHaveURL(/\/posts$/);
    });

    test('navigates to /posts if already logged in and visiting /login page', async ({
      page,
    }) => {
      const randomUser = randomItem(testUsers.filter((u) => u.role !== 'USER'));
      await login(page, randomUser.email, randomUser.password);
      expect(await checkIfLoggedIn(page)).toBe(true);
    });

    test('notifies user that sign-in procedure started on login attempt', async ({
      page,
    }) => {
      const randomUser = randomItem(testUsers.filter((u) => u.role !== 'USER'));

      const responsePromise = page.waitForResponse(
        (res) =>
          res.url().includes(API_ENDPOINTS.AUTH.LOGIN) &&
          res.request().method() === 'POST',
      );

      await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();

      await login(page, randomUser.email, randomUser.password);

      await expect(page.getByRole('button', { name: 'Login' })).toBeHidden();
      await expect(page.getByTestId('login-button')).toContainText(
        /Logging in/i,
      );

      await responsePromise;
    });

    test.describe('validation', () => {
      test('shows validation message if invalid email', async ({ page }) => {
        await login(page, 'notAnEmail', 'password');
        await expect(
          page.getByText(/Please enter.* email address/i),
        ).toBeVisible();
      });

      test('shows error message on invalid credentials', async ({ page }) => {
        const randomUser = randomItem(testUsers);
        await login(
          page,
          randomUser.email + 'dingus',
          randomUser.password + '123',
        );
        await expect(page.getByTestId('login-error')).toBeVisible();
        await expect(page.getByTestId('login-error')).toContainText(
          'Provided credentials are invalid',
        );
      });

      test('shows error message on wrong password', async ({ page }) => {
        const randomUser = randomItem(testUsers);
        await login(page, randomUser.email, randomUser.password + '123');
        await expect(page.getByTestId('login-error')).toBeVisible();
        await expect(page.getByTestId('login-error')).toContainText(
          'Provided password is wrong',
        );
      });

      test('logs user in after correcting and retrying due to validation error', async ({
        page,
      }) => {
        const randomUser = randomItem(testUsers);

        await login(
          page,
          randomUser.email + 'dingus',
          randomUser.password + '123',
        );
        await expect(page.getByTestId('login-error')).toBeVisible();
        await expect(page.getByTestId('login-error')).toContainText(
          'Provided credentials are invalid',
        );

        await page.getByRole('textbox', { name: /email/i }).clear();
        await page.getByRole('textbox', { name: /password/i }).clear();

        await login(page, randomUser.email, randomUser.password);
        expect(await checkIfLoggedIn(page)).toBe(true);
      });
    });
  });
});
