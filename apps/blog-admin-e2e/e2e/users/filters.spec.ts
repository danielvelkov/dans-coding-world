/* eslint-disable playwright/expect-expect */
/* eslint-disable playwright/no-conditional-expect */
/* eslint-disable playwright/no-conditional-in-test */
import type { User, Role } from '@dans-coding-world/prisma-schema';
import { test, expect } from '../fixtures/dbFixture';
import type { Page } from '../fixtures/dbFixture';
import {
  checkIfLoggedIn,
  loginAsRandomUser,
} from '../helpers/user-login.helper';
import { PAGINATION } from '@dans-coding-world/shared-constants';
import { randomSelect, range } from '@dans-coding-world/helpers';
import { waitOutLoader } from '../helpers/loading.helper';
import { generateRandomUser } from '@dans-coding-world/shared-user-testing';
import { goToPage } from '../helpers/pagination.helper';
import { selectUserFilter } from '../helpers/users-management-actions.helper.js';

const USER_ROLES = ['ADMIN', 'AUTHOR', 'MOD', 'USER'] as Role[];

async function assertFilteredCorrectly(
  page: Page,
  users: User[],
  roleFilter?: (typeof USER_ROLES)[number],
  usernameFilter?: string,
) {
  let filtered = [...users]
    .sort((a, b) => {
      return a.id - b.id;
    })
    .filter((p) => (roleFilter ? p.role === roleFilter : true));

  if (usernameFilter)
    filtered = filtered.filter((u) =>
      u.username.toLowerCase().includes(usernameFilter),
    );

  const numOfItemsToCheck = Math.min(
    filtered.length,
    PAGINATION.USERS.DEFAULT_ITEMS_PER_PAGE,
  );

  for (let i = 0; i < numOfItemsToCheck; i++) {
    const row = page.getByLabel(new RegExp(`row entry #${i + 1}$`, 'i'));
    await expect(row).toContainText(filtered[i].username);
  }
}

test.describe('User management page - filtering', () => {
  let users: User[] = [];

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

    users = await db.seedUsers({
      users: mockUsers,
      options: { clearExisting: true, useDefaults: true },
    });

    users = users.sort((a, b) => a.id - b.id);
  });

  test.beforeEach(async ({ page }) => {
    await loginAsRandomUser(
      page,
      users.filter((u) => u.role === 'ADMIN'),
    );
    expect(await checkIfLoggedIn(page)).toBe(true);
    await page.goto('/users');
    await waitOutLoader(page);
  });

  test.beforeEach(async ({ page }) => {
    await loginAsRandomUser(
      page,
      users.filter((u) => u.role === 'ADMIN'),
    );
    expect(await checkIfLoggedIn(page)).toBe(true);
    await page.goto('/users');
    await waitOutLoader(page);
  });

  test.describe('by Role', () => {
    test('filters by All roles by default', async ({ page }) => {
      const options = await page
        .getByLabel(/filter by:/i)
        .getByRole('option')
        .all();
      for (const option of options) {
        const value = await option.getAttribute('value');
        if (value === 'All Roles') {
          await expect(option).toHaveAttribute('selected');
        } else {
          await expect(option).not.toHaveAttribute('selected');
        }
      }
    });

    test('filters users correctly after selecting role', async ({ page }) => {
      const RoleFilter = randomSelect(USER_ROLES);

      await selectUserFilter(page, RoleFilter);

      await assertFilteredCorrectly(page, users, RoleFilter);
    });

    test('will reset to first page on selecting filter', async ({ page }) => {
      expect(users.length).toBeGreaterThan(
        PAGINATION.USERS.DEFAULT_ITEMS_PER_PAGE,
      );
      await goToPage(page, 2);
      await expect(page).toHaveURL(
        new RegExp(`pageOffset=${PAGINATION.USERS.DEFAULT_ITEMS_PER_PAGE}`),
      );

      await selectUserFilter(page, 'USER');
      await waitOutLoader(page);
      await expect(page).not.toHaveURL(
        new RegExp(`pageOffset=${PAGINATION.USERS.DEFAULT_ITEMS_PER_PAGE}`),
      );
      const expectedUsers = users
        .filter((u) => u.role === 'USER')
        .slice(0, PAGINATION.USERS.DEFAULT_ITEMS_PER_PAGE);
      await assertFilteredCorrectly(page, expectedUsers, 'USER');
    });
  });
});
