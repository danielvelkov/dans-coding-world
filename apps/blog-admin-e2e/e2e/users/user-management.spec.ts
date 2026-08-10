/* eslint-disable playwright/no-conditional-expect */
/* eslint-disable playwright/no-conditional-in-test */
import type { Role, User } from '@dans-coding-world/prisma-schema';
import { randomSelect, range } from '@dans-coding-world/helpers';
import { ERROR_CODES, PAGINATION } from '@dans-coding-world/shared-constants';
import { test, expect, type Page } from '../fixtures/dbFixture';
import {
  checkIfLoggedIn,
  login,
  loginAsRandomUser,
} from '../helpers/user-login.helper';
import { waitOutLoader } from '../helpers/loading.helper';
import { UserDetail } from '@dans-coding-world/user-data-access';
import {
  expandUserRow,
  getUserRow,
} from '../helpers/users-management-actions.helper';
import { API_ENDPOINTS } from '@dans-coding-world/shared-data-access-api';
import { generateErrorResponseByErrorCode } from '@dans-coding-world/exceptions';
import { generateRandomUser } from '@dans-coding-world/shared-user-testing';

const USER_ROLES = ['ADMIN', 'AUTHOR', 'MOD', 'USER'] as UserDetail['role'][];

function getVisibleUsers(
  users: UserDetail[],
  limit = PAGINATION.REPORTS.DEFAULT_ITEMS_PER_PAGE,
) {
  return [...users].sort((a, b) => a.id - b.id).slice(0, limit);
}

async function assertRowContainsUserInfo(
  page: Page,
  user: UserDetail,
  rowIndex: number,
) {
  const row = getUserRow(page, rowIndex);

  if (user.profile?.avatarURL)
    await expect(row.getByAltText(`${user.username}'s avatar`)).toBeVisible();
  await expect(row).toContainText(user.username);
  await expect(row).toContainText(user.email);
  await expect(row).toContainText(user.role.toUpperCase());

  if (user.isBanned) await expect(row).toContainText('Banned');
  else await expect(row).toContainText('Active');

  return true;
}

test.describe('User management page', () => {
  let seededUsers: User[] = [];

  test.beforeAll(async ({ db }) => {
    const mockUsers = range(200).map((i) => {
      const mockUser = generateRandomUser();

      return {
        id: i,
        email: mockUser.email,
        username: mockUser.username,
        isBanned:
          mockUser.role !== 'ADMIN' ? randomSelect([false, true]) : false,
        password: mockUser.password,
        role: randomSelect(USER_ROLES),
      } as User;
    });

    seededUsers = await db.seedUsers({
      users: mockUsers,
      options: { clearExisting: true, useDefaults: false },
    });
  });

  test('shows 401 UNAUTHORIZED when not logged in', async ({ page }) => {
    await page.goto('/users');
    await waitOutLoader(page);
    await expect(page.getByText(/401/i)).toBeVisible();
    await expect(page.getByText(/authentication required/i)).toBeVisible();
  });

  test.describe('Authenticated ADMIN', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsRandomUser(
        page,
        seededUsers.filter((u) => u.role === 'ADMIN' && !u.isBanned),
      );
      await waitOutLoader(page);
      expect(await checkIfLoggedIn(page)).toBe(true);
      await page.goto('/users');
      await waitOutLoader(page);
    });

    test('contains "Users" heading with table containing results', async ({
      page,
    }) => {
      await expect(page.locator('h2')).toContainText('Users');
      await expect(page.getByRole('table')).toBeVisible();
    });

    test('each row contains main information about user', async ({ page }) => {
      const visibleUsers = getVisibleUsers(seededUsers);

      for (let i = 0; i < visibleUsers.length; i++) {
        expect(await assertRowContainsUserInfo(page, visibleUsers[i], i)).toBe(
          true,
        );
      }
    });

    test('clicking "expand row" shows user preview details', async ({
      page,
    }) => {
      const users = getVisibleUsers(seededUsers);
      const user = users[0];

      await expandUserRow(page, 0);

      const expandedRow = page.getByTestId(`row-details-${user.id}`);

      await expect(
        expandedRow.getByText(new RegExp(`ID:.*${user.id}`, 'i')),
      ).toBeVisible();

      if (user.profile) {
        await expect(expandedRow.getByText(user.profile.bio)).toBeVisible();
        await expect(
          expandedRow.getByText(user.profile.firstName),
        ).toBeVisible();
        await expect(
          expandedRow.getByText(user.profile.lastName),
        ).toBeVisible();
      }
    });

    test(`expanded row details contains "View reports" link which 
      navigates to reports page and filters by user`, async ({ page }) => {
      const visibleUsers = getVisibleUsers(seededUsers);
      const user = visibleUsers[1];

      await expandUserRow(page, 1);

      const expandedRow = page.getByTestId(`row-details-${user.id}`);
      await expandedRow.getByRole('link', { name: /view.*reports/i }).click();
      await expect(page).toHaveURL(
        `/reports/comments?filterBy[maliciousUserId]=${user.id}`,
      );
    });

    test(`expanded row details contains "View posts" link which 
      navigates to posts page and filters by user`, async ({ page }) => {
      const visibleUsers = getVisibleUsers(seededUsers);
      const user = visibleUsers[0];

      await expandUserRow(page, 0);

      const expandedRow = page.getByTestId(`row-details-${user.id}`);
      await expandedRow.getByRole('link', { name: /view.*posts/i }).click();
      await expect(page).toHaveURL(`/posts?filterBy[userId]=${user.id}`);
    });

    test.describe('User deletion', () => {
      test('shows Delete action and disables it if table row user is ADMIN', async ({
        page,
      }) => {
        const deleteButton = getUserRow(page, 0).getByRole('button', {
          name: /delete/i,
        });
        await expect(deleteButton).toBeVisible();
        const [first] = getVisibleUsers(seededUsers);
        if (first.role === 'ADMIN') await expect(deleteButton).toBeDisabled();
        else await expect(deleteButton).toBeEnabled();
      });

      test(`deleting a user optimistically removes it but on failure to delete,
            it shows error and returns user to results`, async ({ page }) => {
        test.slow();

        const visibleUsers = getVisibleUsers(seededUsers);
        const nonAdmin = visibleUsers.find((u) => u.role === 'USER');
        if (!nonAdmin) throw new Error('Missing fixture');
        const user = nonAdmin;
        const rowIndex = visibleUsers.indexOf(nonAdmin);

        const errorMessage = 'Failed to delete user';

        await page.route(
          `**${API_ENDPOINTS.USERS.BY_ID(user.id)}**`,
          async (route) => {
            await new Promise((resolve) => setTimeout(resolve, 2000));

            await route.fulfill({
              status: 404,
              json: generateErrorResponseByErrorCode(
                ERROR_CODES.SERVER.NOT_FOUND,
                undefined,
                errorMessage,
              ),
            });
          },
        );

        await getUserRow(page, rowIndex)
          .getByRole('button', { name: /delete user/i })
          .click();

        const dialog = page.getByRole('dialog');

        await expect(dialog).toBeVisible();

        await dialog.getByRole('button', { name: /delete user/i }).click();

        await expect(
          getUserRow(page, rowIndex).getByText(user.username),
        ).not.toBeInViewport();

        const error = page.getByTestId('users-error-message');

        await error.waitFor({
          state: 'visible',
          timeout: 30000,
        });

        await expect(error.getByText(errorMessage)).toBeVisible();

        await expect(page.getByText(user.username)).toBeVisible();
        await expect(page.getByText(user.email)).toBeVisible();
      });

      test(`clicking "Delete" opens confirmation dialog,
          which upon confirmation successfully removes user`, async ({
        page,
      }) => {
        const visibleUsers = getVisibleUsers(seededUsers);
        const nonAdmin = visibleUsers.find((u) => u.role !== 'ADMIN');
        if (!nonAdmin) throw new Error('Missing fixture');
        const user = nonAdmin;
        const rowIndex = visibleUsers.indexOf(nonAdmin);

        await getUserRow(page, rowIndex)
          .getByRole('button', { name: /delete user/i })
          .click();

        const dialog = page.getByRole('dialog');

        await expect(dialog).toBeVisible();

        await dialog.getByRole('button', { name: /delete user/i }).click();

        await expect(page.getByText(user.username)).not.toBeInViewport();
        await expect(page.getByText(/user.*deleted/i)).toBeVisible();
        seededUsers = seededUsers.filter((u) => u.id !== user.id);
      });
    });

    test.describe('Change role of user', () => {
      test(`shows "Change role" action if row expanded and disables
         it if table row user is ADMIN`, async ({ page }) => {
        const visibleUsers = getVisibleUsers(seededUsers);
        const user = visibleUsers[0];

        await expandUserRow(page, 0);
        const expandedRow = page.getByTestId(`row-details-${user.id}`);

        const changeRoleButton = expandedRow.getByRole('button', {
          name: /change role/i,
        });
        await expect(changeRoleButton).toBeVisible();
        if (user.role === 'ADMIN')
          await expect(changeRoleButton).toBeDisabled();
        else await expect(changeRoleButton).toBeEnabled();
      });

      test(`selecting "Change user" action opens confirmation dialog
        with a combobox for selecting a different role`, async ({ page }) => {
        const visibleUsers = getVisibleUsers(seededUsers);
        const nonAdmin = visibleUsers.find((u) => u.role === 'USER');
        if (!nonAdmin) throw new Error('Missing fixture');
        const user = nonAdmin;
        const rowIndex = visibleUsers.indexOf(nonAdmin);

        await expandUserRow(page, rowIndex);
        const expandedRow = page.getByTestId(`row-details-${user.id}`);

        const changeRoleButton = expandedRow.getByRole('button', {
          name: /change role/i,
        });
        await changeRoleButton.click();

        const dialog = page.getByRole('dialog');

        await expect(dialog).toBeVisible();

        await expect(
          dialog.getByRole('button', { name: /confirm change/i }),
        ).toBeVisible();

        const roleFilter = dialog.getByLabel(/new role/i);
        await expect(roleFilter).toBeVisible();

        const expectedRoles = USER_ROLES.filter(
          (r) => r !== user.role && r !== 'ADMIN',
        );
        const options = await roleFilter.getByRole('option').all();
        for (const option of options) {
          const value = await option.getAttribute('value');
          expect(expectedRoles.includes(value as Role)).toBe(true);
        }
      });

      test(`confirming "Change user" dialog with a different role selected
        updates user's role and shows message`, async ({ page }) => {
        const visibleUsers = getVisibleUsers(seededUsers);
        const nonAdmin = visibleUsers.find((u) => u.role !== 'ADMIN');
        if (!nonAdmin) throw new Error('Missing fixture');
        const user = nonAdmin;
        const rowIndex = visibleUsers.indexOf(nonAdmin);

        await expandUserRow(page, rowIndex);
        const expandedRow = page.getByTestId(`row-details-${user.id}`);

        const changeRoleButton = expandedRow.getByRole('button', {
          name: /change role/i,
        });
        await changeRoleButton.click();

        const dialog = page.getByRole('dialog');

        const roleFilter = dialog.getByLabel(/new role/i);

        const expectedRoles = USER_ROLES.filter(
          (r) => r !== user.role && r !== 'ADMIN',
        );
        const newRole = randomSelect(expectedRoles);
        await roleFilter.selectOption([newRole]);
        await dialog.getByRole('button', { name: /confirm change/i }).click();
        await waitOutLoader(page);
        await expect(dialog).not.toBeInViewport();

        await assertRowContainsUserInfo(
          page,
          {
            ...user,
            role: newRole,
          },
          rowIndex,
        );
        await expect(
          page.getByText(new RegExp(`user.*role changed to ${newRole}`, 'i')),
        ).toBeInViewport();
        seededUsers[seededUsers.indexOf(nonAdmin)].role = newRole;
      });

      test(`confirming "Change user" dialog does not update user role
        if error occurs and displays message`, async ({ page }) => {
        const errorMessage = 'Failed to promote user';

        const visibleUsers = getVisibleUsers(seededUsers);
        const nonAdmin = visibleUsers.find((u) => u.role !== 'ADMIN');
        if (!nonAdmin) throw new Error('Missing fixture');
        const user = nonAdmin;
        await page.route(
          `**${API_ENDPOINTS.USERS.ROLE_CHANGE(user.id)}**`,
          async (route) => {
            await new Promise((resolve) => setTimeout(resolve, 2000));

            await route.fulfill({
              status: 401,
              json: generateErrorResponseByErrorCode(
                ERROR_CODES.SECURITY.FORBIDDEN_PROMOTION,
                undefined,
                errorMessage,
              ),
            });
          },
        );
        const rowIndex = visibleUsers.indexOf(nonAdmin);

        await expandUserRow(page, rowIndex);
        const expandedRow = page.getByTestId(`row-details-${user.id}`);

        const changeRoleButton = expandedRow.getByRole('button', {
          name: /change role/i,
        });
        await changeRoleButton.click();

        const dialog = page.getByRole('dialog');

        await dialog.getByRole('button', { name: /confirm change/i }).click();
        await waitOutLoader(page);
        await expect(dialog).not.toBeInViewport();

        await assertRowContainsUserInfo(page, user, rowIndex);
        const error = page.getByTestId('users-error-message');

        await error.waitFor({
          state: 'visible',
          timeout: 30000,
        });

        await expect(error.getByText(errorMessage)).toBeVisible();
      });
    });

    test.describe('Ban/Unban user', () => {
      test(`shows "Ban/Unban user" action if row expanded and disables
         it if table row user is ADMIN`, async ({ page }) => {
        const visibleUsers = getVisibleUsers(seededUsers);
        const user = visibleUsers[0];

        await expandUserRow(page, 0);
        const expandedRow = page.getByTestId(`row-details-${user.id}`);

        const banButton = expandedRow.getByRole('button', {
          name: /ban/i,
        });
        await expect(banButton).toBeVisible();
        if (user.role === 'ADMIN') await expect(banButton).toBeDisabled();
        else await expect(banButton).toBeEnabled();
      });

      test(`selecting "Ban/Unban action" action opens confirmation dialog`, async ({
        page,
      }) => {
        const visibleUsers = getVisibleUsers(seededUsers);
        const nonAdmin = visibleUsers.find((u) => u.role === 'USER');
        if (!nonAdmin) throw new Error('Missing fixture');
        const user = nonAdmin;
        const rowIndex = visibleUsers.indexOf(nonAdmin);

        await expandUserRow(page, rowIndex);
        const expandedRow = page.getByTestId(`row-details-${user.id}`);

        const banButton = expandedRow.getByRole('button', {
          name: /ban/i,
        });
        await banButton.click();

        const dialog = page.getByRole('dialog');

        await expect(dialog).toBeVisible();

        await expect(
          dialog.getByRole('button', { name: /ban/i }),
        ).toBeVisible();
      });

      test(`confirming "Ban/Unban" dialog updates user's ban
         status and shows message`, async ({ page }) => {
        const visibleUsers = getVisibleUsers(seededUsers);
        const nonAdmin = visibleUsers.find((u) => u.role !== 'ADMIN');
        if (!nonAdmin) throw new Error('Missing fixture');
        const user = nonAdmin;
        const rowIndex = visibleUsers.indexOf(nonAdmin);

        await expandUserRow(page, rowIndex);
        const expandedRow = page.getByTestId(`row-details-${user.id}`);

        const banButton = expandedRow.getByRole('button', {
          name: /ban/i,
        });
        await banButton.click();

        const dialog = page.getByRole('dialog');

        await dialog.getByRole('button', { name: /ban/i }).click();
        await waitOutLoader(page);
        await expect(dialog).not.toBeInViewport();

        await assertRowContainsUserInfo(
          page,
          {
            ...user,
            isBanned: !user.isBanned,
          },
          rowIndex,
        );
        await expect(
          page.getByText(new RegExp(`user.*#.*banned$`, 'i')),
        ).toBeInViewport();
        seededUsers[seededUsers.indexOf(nonAdmin)].isBanned =
          !seededUsers[seededUsers.indexOf(nonAdmin)].isBanned;
      });

      test(`confirming "Ban/unban" dialog does not update user ban status
        if error occurs and displays message`, async ({ page }) => {
        const errorMessage = 'Failed to ban user';

        const visibleUsers = getVisibleUsers(seededUsers);
        const nonAdmin = visibleUsers.find((u) => u.role !== 'ADMIN');
        if (!nonAdmin) throw new Error('Missing fixture');
        const user = nonAdmin;
        await page.route(
          `**${API_ENDPOINTS.USERS.BAN(user.id)}**`,
          async (route) => {
            await new Promise((resolve) => setTimeout(resolve, 2000));

            await route.fulfill({
              status: 401,
              json: generateErrorResponseByErrorCode(
                ERROR_CODES.SECURITY.FORBIDDEN_PROMOTION,
                undefined,
                errorMessage,
              ),
            });
          },
        );
        const rowIndex = visibleUsers.indexOf(nonAdmin);

        await expandUserRow(page, rowIndex);
        const expandedRow = page.getByTestId(`row-details-${user.id}`);

        const changeRoleButton = expandedRow.getByRole('button', {
          name: /ban/i,
        });
        await changeRoleButton.click();

        const dialog = page.getByRole('dialog');

        await dialog.getByRole('button', { name: /ban/i }).click();
        await waitOutLoader(page);
        await expect(dialog).not.toBeInViewport();

        await assertRowContainsUserInfo(page, user, rowIndex);
        const error = page.getByTestId('users-error-message');

        await error.waitFor({
          state: 'visible',
          timeout: 30000,
        });

        await expect(error.getByText(errorMessage)).toBeVisible();
      });
    });
  });

  test.describe('Logged in as User/Author/Mod', () => {
    const allowedRoles: Role[] = ['USER', 'AUTHOR', 'MOD'];
    test.beforeEach(async ({ page }) => {
      const user = seededUsers.find(
        (u) => allowedRoles.includes(u.role) && !u.isBanned,
      );
      if (!user) throw new Error('Missing fixture');
      await page.goto('/login');
      await login(page, user.email, user.password);
      expect(await checkIfLoggedIn(page)).toBe(true);
    });

    test('shows 403 FORBIDDEN when trying to navigate to page', async ({
      page,
    }) => {
      await page.goto(`/users`);
      await expect(page.getByText(/403/i)).toBeVisible();
      await expect(
        page.getByText(/(access denied|do not have permission)/i),
      ).toBeVisible();
    });
  });
});
