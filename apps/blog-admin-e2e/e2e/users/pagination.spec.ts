/* eslint-disable playwright/no-conditional-in-test */
import type { User } from '@dans-coding-world/prisma-schema';
import { range, chunk, shuffle } from '@dans-coding-world/helpers';
import { PAGINATION } from '@dans-coding-world/shared-constants';
import { API_ENDPOINTS } from '@dans-coding-world/shared-data-access-api';
import { test, expect } from '../fixtures/dbFixture';
import {
  goToPage,
  clickNextPage,
  clickPrevPage,
  selectRowEntriesPerPage,
} from '../helpers/pagination.helper';
import {
  checkIfLoggedIn,
  loginAsRandomUser,
} from '../helpers/user-login.helper';
import {
  generateMockUsersResponse,
  generateRandomUser,
} from '@dans-coding-world/shared-user-testing';

test.describe('User management page - pagination', () => {
  let users: User[] = [];

  test.beforeAll(async ({ db }) => {
    const mockUsers = range(200).map((i) => {
      const mockUser = generateRandomUser({});
      return {
        id: i,
        email: mockUser.email,
        username: mockUser.username,
        isBanned: mockUser.isBanned,
        password: mockUser.password,
        role: 'ADMIN',
      } as User;
    });
    users = await db.seedUsers({
      users: mockUsers,
      options: { clearExisting: true, useDefaults: false },
    });
  });

  test.describe('Element', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsRandomUser(
        page,
        users.filter((u) => u.role === 'ADMIN'),
      );
      expect(await checkIfLoggedIn(page)).toBe(true);
    });

    test('shows up when there are more results than the default page size', async ({
      page,
    }) => {
      await page.route(`**${API_ENDPOINTS.USERS.LIST}**`, (route) =>
        route.fulfill({
          json: generateMockUsersResponse({
            length: PAGINATION.USERS.DEFAULT_ITEMS_PER_PAGE * 2,
            pageSize: PAGINATION.USERS.DEFAULT_ITEMS_PER_PAGE,
          }),
        }),
      );

      await page.goto('/users');
      await expect(page.getByLabel('pagination')).toBeVisible();
    });

    test('is not displayed when results fit on 1 page', async ({ page }) => {
      const numOfTestUsers =
        Math.floor(
          Math.random() * (PAGINATION.USERS.DEFAULT_ITEMS_PER_PAGE - 1),
        ) + 1;
      await page.route(`**${API_ENDPOINTS.USERS.LIST}**`, (route) =>
        route.fulfill({
          json: generateMockUsersResponse({
            length: numOfTestUsers,
            pageSize: PAGINATION.USERS.DEFAULT_ITEMS_PER_PAGE,
          }),
        }),
      );

      await page.goto('/users');
      await expect(page.getByLabel(/expand details/i)).toHaveCount(
        numOfTestUsers,
      );
      await expect(page.getByLabel('pagination')).toBeHidden();
    });

    test('displays correct number of page buttons', async ({ page }) => {
      const expectedPages = 4;
      const pageSize = PAGINATION.USERS.DEFAULT_ITEMS_PER_PAGE;

      await page.route(`**${API_ENDPOINTS.USERS.LIST}**`, (route) =>
        route.fulfill({
          json: generateMockUsersResponse({
            length: expectedPages * pageSize,
            pageSize,
          }),
        }),
      );

      await page.goto('/users');

      const pagination = page.getByLabel('pagination');
      for (let i = 1; i <= expectedPages; i++) {
        await expect(
          pagination.getByRole('button', { name: `page ${i}`, exact: true }),
        ).toBeVisible();
      }
    });
  });

  test.describe('Selection', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsRandomUser(
        page,
        users.filter((u) => u.role === 'ADMIN'),
      );
      expect(await checkIfLoggedIn(page)).toBe(true);
      await page.goto('/users');
    });

    test('navigates to next page of results on clicking "next"', async ({
      page,
    }) => {
      const pagesWithUsersArray = chunk(
        users,
        PAGINATION.USERS.DEFAULT_ITEMS_PER_PAGE,
      );
      const numOfPages = pagesWithUsersArray.length;

      for (let i = 0; i < numOfPages; i++) {
        for (const user of pagesWithUsersArray[i]) {
          await expect(page.getByText(user.username)).toBeVisible();
        }
        if (i < numOfPages - 1) {
          await clickNextPage(page);
        }
      }
    });

    test('disables "next" button if on last page of results', async ({
      page,
    }) => {
      const lastPage = Math.ceil(
        users.length / PAGINATION.USERS.DEFAULT_ITEMS_PER_PAGE,
      );
      await goToPage(page, lastPage);

      await expect(page.getByLabel('next page')).toBeDisabled();
      await expect(page.getByLabel('prev page')).toBeEnabled();
    });

    test('navigates to previous page on clicking "prev"', async ({ page }) => {
      const pagesWithUsersArray = chunk(
        users,
        PAGINATION.USERS.DEFAULT_ITEMS_PER_PAGE,
      );
      const numOfPages = pagesWithUsersArray.length;

      await goToPage(page, numOfPages);

      for (let i = numOfPages - 1; i >= 0; i--) {
        for (const user of pagesWithUsersArray[i]) {
          await expect(page.getByText(user.username)).toBeVisible();
        }
        if (i > 0) {
          await clickPrevPage(page);
        }
      }
    });

    test('disables "prev" button if on first page of results', async ({
      page,
    }) => {
      await goToPage(page, 1);

      await expect(page.getByLabel('prev page')).toBeDisabled();
      await expect(page.getByLabel('next page')).toBeEnabled();
    });

    test('navigating to a random page displays the right results', async ({
      page,
    }) => {
      const pagesWithUsersArray = chunk(
        users,
        PAGINATION.USERS.DEFAULT_ITEMS_PER_PAGE,
      );
      const numOfPages = pagesWithUsersArray.length;
      const randomPages = shuffle(range(numOfPages));

      for (const randomPage of randomPages) {
        await goToPage(page, randomPage);
        for (const user of pagesWithUsersArray[randomPage - 1]) {
          await expect(page.getByText(user.username)).toBeVisible();
        }
      }
    });

    test.describe('with different entries per page selected', () => {
      test('shows the right amount of users', async ({ page }) => {
        for (const pageSize of PAGINATION.USERS.ITEMS_PER_PAGE_OPTIONS) {
          await selectRowEntriesPerPage(page, pageSize);
          await expect(page.getByLabel(/expand details/i)).toHaveCount(
            pageSize,
          );
        }
      });

      test('show correct row entry numbering', async ({ page }) => {
        // this test is slow so the function call below triples timeout
        test.slow();
        for (const pageSize of PAGINATION.USERS.ITEMS_PER_PAGE_OPTIONS) {
          await selectRowEntriesPerPage(page, pageSize);
          const expectedPages = Math.ceil(users.length / pageSize);
          for (let pageIndex = 1; pageIndex <= expectedPages; pageIndex++) {
            const pagination = page.getByLabel('pagination');
            await pagination
              .getByRole('button', { name: `page ${pageIndex}`, exact: true })
              .click();

            const start = (pageIndex - 1) * pageSize + 1;
            const end =
              pageIndex === expectedPages ? users.length : pageIndex * pageSize;
            await expect(
              page.getByText(
                `Showing ${start} - ${end} of ${users.length} entries`,
              ),
            ).toBeVisible();

            for (const entryIndex of Array.from({ length: pageSize }).map(
              (_, i) => i + 1,
            )) {
              const rowEntryIndex = (pageIndex - 1) * pageSize + entryIndex;
              if (rowEntryIndex > users.length) break;
              await expect(
                page.getByLabel(`Row entry #${rowEntryIndex}`, { exact: true }),
              ).toBeVisible();
            }
          }
        }
      });

      test('displays correct number of pagination buttons', async ({
        page,
      }) => {
        for (const pageSize of PAGINATION.USERS.ITEMS_PER_PAGE_OPTIONS) {
          await selectRowEntriesPerPage(page, pageSize);
          const expectedPages = Math.ceil(users.length / pageSize);
          const pagination = page.getByLabel('pagination');

          for (let i = 1; i <= expectedPages; i++) {
            await expect(
              pagination.getByRole('button', {
                name: `page ${i}`,
                exact: true,
              }),
            ).toBeVisible();
          }
        }
      });
      for (const pageSize of PAGINATION.USERS.ITEMS_PER_PAGE_OPTIONS) {
        test(`shows correct results for page size ${pageSize}`, async ({
          page,
        }) => {
          await selectRowEntriesPerPage(page, pageSize);

          const pagesWithUsersArray = chunk(users, pageSize);
          const numOfPages = pagesWithUsersArray.length;

          for (let pageIndex = 1; pageIndex <= numOfPages; pageIndex++) {
            await goToPage(page, pageIndex);

            for (const user of pagesWithUsersArray[pageIndex - 1]) {
              await expect(
                page.getByText(user.username, { exact: true }),
              ).toBeVisible();
            }
          }
        });
      }
    });
  });
});
