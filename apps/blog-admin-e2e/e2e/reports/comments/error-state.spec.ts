import { API_ENDPOINTS } from '@dans-coding-world/shared-data-access-api';
import { test, expect } from '../../fixtures/dbFixture';
import {
  checkIfLoggedIn,
  loginAsRandomUser,
} from '../../helpers/user-login.helper';
import type { User } from '@dans-coding-world/prisma-schema';
import { generateErrorResponseByErrorCode } from '@dans-coding-world/exceptions';
import { ERROR_CODES } from '@dans-coding-world/shared-constants';

test.describe('Comment reports page - error state', () => {
  let users: User[] = [];
  test.beforeAll(async ({ db }) => {
    users = (await db.seedUsers({
      users: [],
      options: { useDefaults: true, clearExisting: true },
    })) as User[];
    if (!users?.length) throw new Error('Missing user fixtures');
  });

  test.beforeEach(async ({ page }) => {
    await loginAsRandomUser(
      page,
      users.filter((u) => u.role === 'ADMIN'),
    );
    expect(await checkIfLoggedIn(page)).toBe(true);
  });

  test('shows error message when api fetch fails', async ({ page }) => {
    test.setTimeout(60_000);
    const message = 'Something went wrong';
    const errorResponse = generateErrorResponseByErrorCode(
      ERROR_CODES.AUTH.UNAUTHORIZED,
      undefined,
      message,
    );
    await page.route(`**${API_ENDPOINTS.REPORTS.COMMENTS.LIST}**`, (route) =>
      route.fulfill({
        status: 401,
        json: errorResponse,
      }),
    );

    await page.goto('/reports/comments');
    await expect(page.getByText(message)).toBeVisible({ timeout: 60_000 });
  });
});
