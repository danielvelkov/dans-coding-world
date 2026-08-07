import type { User } from '@dans-coding-world/prisma-schema';
import { test, expect } from '../fixtures/dbFixture';
import type { Page } from '../fixtures/dbFixture';
import { selectUsernameSorting } from '../helpers/users-management-actions.helper.js';
import {
  checkIfLoggedIn,
  loginAsRandomUser,
} from '../helpers/user-login.helper';
import { waitOutLoader } from '../helpers/loading.helper';
import { range, sortObjectsByStringProp } from '@dans-coding-world/helpers';
import { generateRandomUser } from '@dans-coding-world/shared-user-testing';
import { PAGINATION } from '@dans-coding-world/shared-constants';

async function checkIfSortedCorrectly(
  page: Page,
  users: User[],
  field?: 'username',
  order?: 'asc' | 'desc',
) {
  let sorted = [...users];
  if (field && order)
    sorted = [...users].sort(sortObjectsByStringProp(field, order));

  const numOfItemsToCheck = Math.min(
    sorted.length,
    PAGINATION.USERS.DEFAULT_ITEMS_PER_PAGE,
  );

  for (let i = 0; i < numOfItemsToCheck; i++) {
    const row = page.getByLabel(new RegExp(`row entry #${i + 1}$`, 'i'));
    await expect(row).toContainText(sorted[i].username);
  }
  return true;
}

test.describe('User management page - sorting', () => {
  let seededUsers: User[] = [];

  test.beforeAll(async ({ db }) => {
    const mockUsers = range(20).map((i) => {
      const mockUser = generateRandomUser({});
      return {
        id: i + 5,
        email: mockUser.email,
        username: mockUser.username,
        isBanned: mockUser.isBanned,
        password: mockUser.password,
        role: 'ADMIN',
      } as User;
    });

    seededUsers = await db.seedUsers({
      users: mockUsers,
      options: { clearExisting: true, useDefaults: true },
    });

    seededUsers = seededUsers.sort((a, b) => a.id - b.id);
  });

  test.beforeEach(async ({ page }) => {
    await loginAsRandomUser(
      page,
      seededUsers.filter((u) => u.role === 'ADMIN'),
    );
    expect(await checkIfLoggedIn(page)).toBe(true);
    await page.goto('/users');
    await waitOutLoader(page);
  });

  test('sorts users by id by default', async ({ page }) => {
    expect(await checkIfSortedCorrectly(page, seededUsers)).toBe(true);
  });

  test.describe('user sorting', () => {
    test('sorts by Created asc', async ({ page }) => {
      await selectUsernameSorting(page, 'Username (A-Z, then a-z)');
      expect(
        await checkIfSortedCorrectly(page, seededUsers, 'username', 'asc'),
      ).toBeTruthy();
    });

    test('sorts by Created desc', async ({ page }) => {
      await selectUsernameSorting(page, 'Username (z-a, then Z-A)');
      expect(
        await checkIfSortedCorrectly(page, seededUsers, 'username', 'desc'),
      ).toBeTruthy();
    });
  });
});
