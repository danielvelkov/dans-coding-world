import type { User } from '@dans-coding-world/prisma-schema';
import { test, expect } from '../../fixtures/dbFixture';
import { API_ENDPOINTS } from '@dans-coding-world/shared-data-access-api';
import {
  checkIfLoggedIn,
  loginAsRandomUser,
} from '../../helpers/user-login.helper';

test.describe('Comment reports page - loading state', () => {
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
      users.filter((u) => u.role === 'MOD' || u.role === 'ADMIN'),
    );
    expect(await checkIfLoggedIn(page)).toBe(true);
  });
  test('shows "Loading..." message while fetching rows', async ({ page }) => {
    await page.route(
      `**${API_ENDPOINTS.REPORTS.COMMENTS.LIST}**`,
      async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return route.fulfill({
          json: [],
        });
      },
    );
    await page.goto('/reports/comments');
    await expect(page.locator('table')).toContainText(/loading reports/i);
  });
});
