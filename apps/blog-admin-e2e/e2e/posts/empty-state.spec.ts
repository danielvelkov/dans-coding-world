import { API_ENDPOINTS } from '@dans-coding-world/shared-data-access-api';
import { generateMockPostsResponse } from '@dans-coding-world/shared-post-testing';
import { test, expect } from '../fixtures/dbFixture';
import {
  checkIfLoggedIn,
  loginAsRandomUser,
} from '../helpers/user-login.helper';
import type { User } from '@dans-coding-world/prisma-schema';
test.describe('Posts page - empty state', () => {
  let users: User[] = [];
  test.beforeAll(async ({ db }) => {
    users = (await db.seedUsers({
      users: [],
      options: { useDefaults: true, clearExisting: true },
    })) as User[];
    if (!users?.length) throw new Error('Missing user fixtures');
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await loginAsRandomUser(
      page,
      users.filter((u) => u.role !== 'USER'),
    );
    expect(await checkIfLoggedIn(page)).toBe(true);
  });

  test('shows call to action message when no table rows', async ({ page }) => {
    await page.route(`**${API_ENDPOINTS.POSTS.LIST}**`, (route) =>
      route.fulfill({
        json: generateMockPostsResponse({
          length: 0,
          pageSize: 10,
        }),
      }),
    );

    await page.goto('/posts');
    await expect(page.locator('table')).toContainText(/no posts/i);
  });
});
