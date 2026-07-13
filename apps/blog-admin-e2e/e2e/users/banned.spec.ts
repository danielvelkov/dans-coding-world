import type { UserDetail } from '@dans-coding-world/user-data-access';
import { test, expect } from '../fixtures/dbFixture';
import {
  login,
  checkIfLoggedIn,
  checkIfLoggedOut,
} from '../helpers/user-login.helper';
import { generateRandomUser } from '@dans-coding-world/shared-user-testing';

test.describe('User - BANNED status', () => {
  let bannedUser: UserDetail;

  test.beforeAll(async ({ db }) => {
    [bannedUser] = await db.seedUsers({
      users: [generateRandomUser({ isBanned: true, role: 'AUTHOR' })],
      options: { useDefaults: false, clearExisting: true },
    });
    if (!bannedUser) throw new Error('Missing user fixtures');
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('on valid login, shows "You are banned" message and automatically logs user out', async ({
    page,
  }) => {
    await page.clock.install({ time: new Date() });
    await login(page, bannedUser.email, bannedUser.password);

    await expect(page.getByText(/you.*banned/i)).toBeVisible();

    expect(await checkIfLoggedIn(page)).toBe(true);
    await page.clock.runFor('00:10'); // 10 seconds
    expect(await checkIfLoggedOut(page)).toBe(true);
  });
});
