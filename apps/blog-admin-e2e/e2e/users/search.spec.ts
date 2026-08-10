import {
  generateRandomString,
  randomSelect,
  range,
} from '@dans-coding-world/helpers';
import type { User } from '@dans-coding-world/prisma-schema';
import { USER_CONSTRAINTS } from '@dans-coding-world/shared-constants';
import { test, expect, Page } from '../fixtures/dbFixture';
import {
  checkIfLoggedIn,
  loginAsRandomUser,
} from '../helpers/user-login.helper';
import { waitOutLoader } from '../helpers/loading.helper';
import { searchForUser } from '../helpers/users-management-actions.helper';
import { generateRandomUser } from '@dans-coding-world/shared-user-testing';

async function checkIfSearchedCorrectly(
  page: Page,
  users: User[],
  searchTerm: string,
) {
  const filtered = users.filter((u) =>
    u.username.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  try {
    for (let i = 0; i < filtered.length; i++) {
      const row = page.getByLabel(new RegExp(`row entry #${i + 1}`, 'i'));
      await expect(row).toContainText(filtered[i].username);
    }
    return true;
  } catch (error) {
    return false;
  }
}

test.describe('User management page - search', () => {
  let seededUsers: User[];
  test.beforeAll(async ({ db }) => {
    const mockUsers = range(20).map((i) => {
      const mockUser = generateRandomUser({});
      return {
        id: i + 5,
        email: mockUser.email,
        username: mockUser.username,
        isBanned: mockUser.isBanned,
        password: mockUser.password,
        role: mockUser.role,
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

  test.describe('Input element', () => {
    test('does not allow typing past a certain limit', async ({ page }) => {
      const longSearchString = generateRandomString(
        USER_CONSTRAINTS.MAX_USERNAME_LENGTH + 20,
      );
      const input = page
        .locator('search')
        .getByRole('textbox', { name: /search by username/i });

      await input.fill(longSearchString);

      await expect(input).not.toHaveValue(longSearchString);
      await expect(input).toHaveValue(
        longSearchString.substring(0, USER_CONSTRAINTS.MAX_USERNAME_LENGTH),
      );
    });
  });

  test('finds all users that contain search term username (case insensitive)', async ({
    page,
  }) => {
    test.slow();
    const commonTerm = randomSelect(seededUsers).username.substring(0, 3);

    for (const searchTerm of [commonTerm, commonTerm.toUpperCase()]) {
      await searchForUser(page, searchTerm);
      await page.waitForTimeout(1000);
      expect(
        await checkIfSearchedCorrectly(page, seededUsers, commonTerm),
      ).toBe(true);
    }
  });

  test('applies search when navigating to page through URL', async ({
    page,
  }) => {
    const searchTerm = 'admin';

    await page.goto(`/users?searchQuery=${searchTerm}`);

    await page.waitForLoadState();

    await expect(
      page
        .locator('search')
        .getByRole('textbox', { name: /search by username/i }),
    ).toHaveValue(searchTerm);

    expect(await checkIfSearchedCorrectly(page, seededUsers, searchTerm)).toBe(
      true,
    );
  });
});
