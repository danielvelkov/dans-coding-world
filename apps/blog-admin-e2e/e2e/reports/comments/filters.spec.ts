/* eslint-disable playwright/expect-expect */
/* eslint-disable playwright/no-conditional-expect */
/* eslint-disable playwright/no-conditional-in-test */
import type {
  Post,
  PostStatus,
  User,
  Report,
} from '@dans-coding-world/prisma-schema';
import { test, expect } from '../../fixtures/dbFixture';
import type { Page } from '../../fixtures/dbFixture';
import {
  checkIfLoggedIn,
  loginAsRandomUser,
} from '../../helpers/user-login.helper';
import { ERROR_CODES, PAGINATION } from '@dans-coding-world/shared-constants';
import { randomSelect, range } from '@dans-coding-world/helpers';
import { waitOutLoader } from '../../helpers/loading.helper';
import { generateMockUsersResponse } from '@dans-coding-world/shared-user-testing';
import { API_ENDPOINTS } from '@dans-coding-world/shared-data-access-api';
import { sortObjectsByStringProp } from '@dans-coding-world/helpers';
import {
  goToPage,
  selectRowEntriesPerPage,
} from '../../helpers/pagination.helper';
import { generateErrorResponseByErrorCode } from '@dans-coding-world/exceptions';
import { ReportDetail } from '@dans-coding-world/report-data-access';
import { generateRandomComments } from '@dans-coding-world/shared-post-testing';
import { generateRandomCommentReports } from '@dans-coding-world/shared-report-testing';
import {
  selectReportFilter,
  filterByPostInRow,
  filterByReportedUserInRow,
} from '../../helpers/reports-actions.helper';

const STATUSES = ['DISMISSED', 'PENDING', 'RESOLVED', 'REVIEWING'];
const DEFAULT_STATUS_FILTER = ['PENDING'];

async function assertFilteredCorrectly(
  page: Page,
  reports: ReportDetail[],
  statusFilter: (typeof STATUSES)[number][] = DEFAULT_STATUS_FILTER,
  userFilter?: number,
  postFilter?: number,
) {
  let filtered = [...reports]
    .sort((a, b) => {
      return (
        new Date(b.createdAt as Date).getTime() -
        new Date(a.createdAt as Date).getTime()
      );
    })
    .filter((p) => statusFilter.includes(p.status));

  if (userFilter)
    filtered = filtered.filter((r) => r.reportedComment.userId === userFilter);
  if (postFilter)
    filtered = filtered.filter((r) => r.reportedComment.postId === postFilter);

  const numOfItemsToCheck = Math.min(
    filtered.length,
    PAGINATION.REPORTS.DEFAULT_ITEMS_PER_PAGE,
  );

  for (let i = 0; i < numOfItemsToCheck; i++) {
    const row = page.getByLabel(new RegExp(`row entry #${i + 1}$`, 'i'));
    await expect(row).toContainText(filtered[i].reason);
  }
}

/** Randomly picks at least one value from each category. */
function buildRandomFilters<T>(values: T[]): T[] {
  const picked = values.filter(() => Math.random() > 0.3);
  return picked.length ? picked : [values[0]];
}

test.describe('Comment reports page - filtering', () => {
  let users: User[] = [];
  let seededPosts: Post[] = [];
  let seededReports: ReportDetail[] = [];

  test.beforeAll(async ({ db }) => {
    users = await db.seedUsers({
      users: null,
      options: { clearExisting: true, useDefaults: true },
    });

    seededPosts = await db.seedPosts({
      posts: null,
      options: { useDefaults: true, clearExisting: true },
    });

    const numOfComments =
      Math.floor(
        Math.random() * (PAGINATION.REPORTS.ITEMS_PER_PAGE_OPTIONS[2] + 1),
      ) + 40;

    const commentsToSeed = generateRandomComments(1, numOfComments);

    const seededComments = await db.seedComments({
      comments: commentsToSeed.map((c) => ({
        id: c.id,
        threadParentId: null,
        content: c.content,
        createdAt: c.createdAt,
        depth: c.depth,
        updatedAt: c.updatedAt,
        postId: randomSelect(seededPosts.map((p) => p.id)),
        userId: randomSelect(users.map((u) => u.id)),
      })),
      options: {
        useDefaults: false,
        clearExisting: true,
      },
    });

    const mockReports = generateRandomCommentReports(numOfComments);

    const reportsToSeed = range(
      numOfComments, // same num as comments as reporter comment is a unique constraint
    ).map((i) => {
      const dateWithOffset = new Date(seededPosts[0].createdAt as Date);
      (dateWithOffset as Date)?.setUTCDate(
        (dateWithOffset as Date).getUTCDate() + i,
      );
      const reportedComment = seededComments[i - 1];
      const userDifferentThanCommentAuthor = randomSelect(
        users.filter((u) => u.id !== reportedComment.userId),
      );
      return {
        id: i,
        createdAt: dateWithOffset,
        reason: mockReports[i - 1].reason,
        commentId: reportedComment.id,
        reporterId: userDifferentThanCommentAuthor.id,
        status: randomSelect(STATUSES),
      } as Report;
    });

    seededReports = (
      await db.seedReports({
        reports: reportsToSeed,
        options: {
          useDefaults: false,
          clearExisting: true,
        },
      })
    ).map(
      (r) =>
        ({
          ...r,
          reportedComment: seededComments.find((c) => c.id === r.commentId),
        }) as ReportDetail,
    );

    // Sort by default order: createdAt desc
    seededReports.sort((prev, next) => {
      const prevDate = new Date(prev.createdAt as Date);
      const nextDate = new Date(next.createdAt as Date);
      return nextDate.getTime() - prevDate.getTime();
    });
  });

  test.describe('by Status', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsRandomUser(
        page,
        users.filter((u) => u.role === 'ADMIN' || u.role === 'MOD'),
      );
      expect(await checkIfLoggedIn(page)).toBe(true);
      await page.goto('/reports/comments');
      await waitOutLoader(page);
    });

    test('filters by PENDING by default', async ({ page }) => {
      const options = await page
        .getByLabel(/filter by:/i)
        .getByRole('option')
        .all();
      for (const option of options) {
        const value = await option.getAttribute('value');
        if (value === DEFAULT_STATUS_FILTER[0]) {
          await expect(option).toHaveAttribute('selected');
        } else {
          await expect(option).not.toHaveAttribute('selected');
        }
      }
    });

    test('can multiselect statuses to filter by', async ({ page }) => {
      const selectedFilters = ['RESOLVED', 'REVIEWING'];
      await selectReportFilter(page, selectedFilters);
      await assertFilteredCorrectly(page, seededReports, selectedFilters);
    });

    test(`disables the last remaining selected option in status`, async ({
      page,
    }) => {
      test.slow();

      for (const optionValue of [
        'DISMISSED',
        'PENDING',
        'RESOLVED',
        'REVIEWING',
      ]) {
        await selectReportFilter(page, [optionValue]);

        const options = await page
          .getByLabel(/filter by:/i)
          .getByRole('option')
          .all();

        for (const option of options) {
          const value = await option.getAttribute('value');
          if (value === optionValue) {
            await expect(option).toHaveAttribute('disabled');
          } else {
            await expect(option).not.toHaveAttribute('disabled');
          }
        }
      }
    });

    test('selecting a STATUS option deselects other STATUS options', async ({
      page,
    }) => {
      test.slow();

      for (const status of STATUSES) {
        await selectReportFilter(page, [status]);

        const options = await page
          .getByLabel(/filter by:/i)
          .getByRole('option')
          .all();

        for (const option of options) {
          const value = await option.getAttribute('value');
          const shouldBeSelected =
            value === status || !STATUSES.includes(value as PostStatus);

          if (shouldBeSelected) {
            await expect(option).toHaveAttribute('selected');
          } else {
            await expect(option).not.toHaveAttribute('selected');
          }
        }
      }
    });

    test('filters posts correctly with a random combination of statuses', async ({
      page,
    }) => {
      test.slow();

      const statusFilter = buildRandomFilters(
        STATUSES.filter((s) => s !== 'PENDING'),
      ) as PostStatus[];

      await selectReportFilter(page, statusFilter);

      await assertFilteredCorrectly(page, seededReports, statusFilter);
    });

    test('will reset to first page on selecting  filter', async ({ page }) => {
      expect(seededReports.length).toBeGreaterThan(
        PAGINATION.REPORTS.DEFAULT_ITEMS_PER_PAGE,
      );
      await goToPage(page, 2);
      await expect(page).toHaveURL(
        new RegExp(`pageOffset=${PAGINATION.REPORTS.DEFAULT_ITEMS_PER_PAGE}`),
      );
      await selectReportFilter(page, ['REVIEWING']);
      await waitOutLoader(page);
      await expect(page).not.toHaveURL(
        new RegExp(`pageOffset=${PAGINATION.REPORTS.DEFAULT_ITEMS_PER_PAGE}`),
      );
      const expectedReports = seededReports
        .filter((r) => r.status === 'REVIEWING')
        .slice(0, PAGINATION.REPORTS.DEFAULT_ITEMS_PER_PAGE);
      await assertFilteredCorrectly(page, expectedReports, ['REVIEWING']);
    });
  });

  test.describe('by User (malicious user filter)', () => {
    let seededUsersWithNewAdditions: User[] = [];

    test.beforeAll(async ({ db }) => {
      const mockUsersResponse = generateMockUsersResponse({
        length: PAGINATION.USERS.DEFAULT_ITEMS_PER_PAGE + 5,
      });
      if (!mockUsersResponse.data?.items.length) {
        throw new Error('Missing user fixtures');
      }

      const mockUsers = mockUsersResponse.data.items;
      const extraUsers = await db.seedUsers({
        users: mockUsers.map((u, i) => ({
          ...u,
          id: users.length + 10 + i,
        })),
        options: { clearExisting: false, useDefaults: false },
      });

      seededUsersWithNewAdditions = [...users, ...extraUsers].sort(
        sortObjectsByStringProp('username', 'asc'),
      );
    });

    test.describe('logged in as ADMIN/MOD', () => {
      test.beforeEach(async ({ page }) => {
        await loginAsRandomUser(
          page,
          users.filter((u) => u.role === 'ADMIN' || u.role === 'MOD'),
        );
        expect(await checkIfLoggedIn(page)).toBe(true);
        await page.goto('/reports/comments');
        await waitOutLoader(page);
      });

      test('selecting a userId from expanded row details filters reports by that user', async ({
        page,
      }) => {
        const reportedUserId = await filterByReportedUserInRow(page, 0);

        const expectedReports = seededReports.filter(
          (r) =>
            r.reportedComment.userId === reportedUserId &&
            DEFAULT_STATUS_FILTER.includes(r.status),
        );

        await assertFilteredCorrectly(
          page,
          expectedReports,
          DEFAULT_STATUS_FILTER,
          reportedUserId,
        );
      });

      test('clearing the user filter restores unfiltered reports list', async ({
        page,
      }) => {
        test.slow();
        const reportedUserId = await filterByReportedUserInRow(page, 0);

        const filteredReports = seededReports.filter(
          (r) =>
            r.reportedComment.userId === reportedUserId &&
            DEFAULT_STATUS_FILTER.includes(r.status),
        );
        await assertFilteredCorrectly(
          page,
          filteredReports,
          DEFAULT_STATUS_FILTER,
          reportedUserId,
        );

        await page.getByTitle(/clear user filter/i).click();

        await assertFilteredCorrectly(
          page,
          seededReports,
          DEFAULT_STATUS_FILTER,
        );
      });

      test('resets to first page when applying a user filter from a non-first page', async ({
        page,
      }) => {
        await goToPage(page, 2);
        await expect(page).toHaveURL(
          new RegExp(`pageOffset=${PAGINATION.REPORTS.DEFAULT_ITEMS_PER_PAGE}`),
        );

        const reportedUserId = await filterByReportedUserInRow(
          page,
          PAGINATION.REPORTS.DEFAULT_ITEMS_PER_PAGE,
        );

        await expect(page).not.toHaveURL(
          new RegExp(`pageOffset=${PAGINATION.REPORTS.DEFAULT_ITEMS_PER_PAGE}`),
        );

        const expectedReports = seededReports.filter(
          (r) =>
            r.reportedComment.userId === reportedUserId &&
            DEFAULT_STATUS_FILTER.includes(r.status),
        );

        await assertFilteredCorrectly(
          page,
          expectedReports,
          DEFAULT_STATUS_FILTER,
          reportedUserId,
        );
      });
    });

    test.describe('logged in as ADMIN', () => {
      test.beforeEach(async ({ page }) => {
        await loginAsRandomUser(
          page,
          users.filter((u) => u.role === 'ADMIN'),
        );
        expect(await checkIfLoggedIn(page)).toBe(true);
        await page.goto('/reports/comments');
        await waitOutLoader(page);
      });

      test('search box is shown to admin', async ({ page }) => {
        await expect(
          page.getByRole('searchbox', { name: 'Search for:' }),
        ).toBeInViewport();
      });

      test('clicking searchbox loads and displays the first page of users', async ({
        page,
      }) => {
        const search = page.getByRole('searchbox', { name: 'Search for:' });
        const listbox = page.getByTestId('dropdown-search-listbox');

        await expect(listbox).not.toBeInViewport();
        await search.click();
        await expect(listbox).toBeInViewport();

        const expectedCount = Math.min(
          seededUsersWithNewAdditions.length,
          PAGINATION.USERS.DEFAULT_ITEMS_PER_PAGE,
        );
        const options = await listbox.getByRole('option').all();
        expect(options).toHaveLength(expectedCount);

        for (let i = 0; i < expectedCount; i++) {
          await expect(
            page.getByRole('option', {
              name: seededUsersWithNewAdditions[i].username,
            }),
          ).toBeAttached();
        }
      });

      test('shows loading indicator while fetching users', async ({ page }) => {
        await page.route(`**${API_ENDPOINTS.USERS.LIST}**`, async (route) => {
          await new Promise((resolve) => setTimeout(resolve, 40000));
          await route.fulfill({ json: [] });
        });

        await page.reload();

        await page.getByRole('searchbox', { name: 'Search for:' }).click();

        await expect(page.getByTestId('dropdown-search-listbox')).toContainText(
          /searching/i,
        );
      });

      test('scrolling to the last option triggers loading the next page', async ({
        page,
      }) => {
        expect(seededUsersWithNewAdditions.length).toBeGreaterThan(
          PAGINATION.USERS.DEFAULT_ITEMS_PER_PAGE,
        );

        await page.getByRole('searchbox', { name: 'Search for:' }).click();

        const listbox = page.getByTestId('dropdown-search-listbox');
        const initialOptions = await listbox.getByRole('option').all();
        expect(initialOptions).toHaveLength(
          PAGINATION.USERS.DEFAULT_ITEMS_PER_PAGE,
        );

        // Scroll inside the dropdown container to trigger IntersectionObserver
        await listbox.evaluate((el) => {
          el.scrollTop = el.scrollHeight;
        });
        await page.waitForTimeout(300);

        const expectedCount = Math.min(
          seededUsersWithNewAdditions.length,
          PAGINATION.USERS.DEFAULT_ITEMS_PER_PAGE * 2,
        );
        const updatedOptions = await listbox.getByRole('option').all();
        expect(updatedOptions).toHaveLength(expectedCount);
      });

      test('selecting a user from the dropdown filters reports against that user', async ({
        page,
      }) => {
        test.slow();

        const rowsPerPagePresent = page.getByLabel('Rows per page', {
          exact: true,
        });
        if (rowsPerPagePresent)
          await selectRowEntriesPerPage(
            page,
            PAGINATION.REPORTS.ITEMS_PER_PAGE_OPTIONS.at(-1)!,
          );

        const randomReportDetail = randomSelect(seededReports);
        const reportedUser = seededUsersWithNewAdditions.find(
          (u) => u.id === randomReportDetail.reportedComment.userId,
        );
        if (!reportedUser)
          throw new Error('Reported user not found in seeded users');

        const search = page.getByRole('searchbox', { name: 'Search for:' });
        await search.click();
        await search.fill(reportedUser.username);
        await page
          .getByTestId('dropdown-search-listbox')
          .getByRole('option', { name: reportedUser.username })
          .click();

        const reportsMadeAgainstUser = seededReports.filter(
          (r) => r.reportedComment.userId === reportedUser.id,
        );
        await assertFilteredCorrectly(page, reportsMadeAgainstUser, [
          'PENDING',
        ]);
      });

      test('displays error if api response for users fails', async ({
        page,
      }) => {
        // custom timeout because of tanstack query retry ms
        test.setTimeout(60_000);
        const errorMessage = 'Failed to fetch users';
        await page.route(
          `**${API_ENDPOINTS.USERS.LIST}**`,
          async (route) =>
            await route.fulfill({
              status: 401,
              json: generateErrorResponseByErrorCode(
                ERROR_CODES.AUTH.UNAUTHORIZED,
                undefined,
                errorMessage,
              ),
            }),
        );

        await page.reload();
        await waitOutLoader(page);
        const search = page.getByRole('searchbox', { name: 'Search for:' });
        await search.click();
        const searchSpinner = page
          .getByTestId('dropdown-search-listbox')
          .getByText(/searching/i);
        await searchSpinner.waitFor({ state: 'hidden', timeout: 100000 });
        await expect(page.getByTestId('dropdown-search-listbox')).toContainText(
          errorMessage,
        );
      });
    });
  });

  test.describe('by Post ID', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsRandomUser(
        page,
        users.filter((u) => u.role === 'ADMIN' || u.role === 'MOD'),
      );
      expect(await checkIfLoggedIn(page)).toBe(true);
      await page.goto('/reports/comments');
      await waitOutLoader(page);
    });

    test(`selecting post ID from expanded report details
      filters reports against comments in that post`, async ({ page }) => {
      const postId = await filterByPostInRow(page, 0);

      const expectedReports = seededReports.filter(
        (r) =>
          r.reportedComment.postId === postId &&
          DEFAULT_STATUS_FILTER.includes(r.status),
      );

      await assertFilteredCorrectly(
        page,
        expectedReports,
        DEFAULT_STATUS_FILTER,
        undefined,
        postId,
      );
    });

    test('clearing the post filter restores unfiltered reports list', async ({
      page,
    }) => {
      test.slow();
      const postId = await filterByPostInRow(page, 0);

      const filteredReports = seededReports.filter(
        (r) =>
          r.reportedComment.postId === postId &&
          DEFAULT_STATUS_FILTER.includes(r.status),
      );
      await assertFilteredCorrectly(
        page,
        filteredReports,
        DEFAULT_STATUS_FILTER,
        undefined,
        postId,
      );

      await page.getByTitle(/clear post filter/i).click();

      await assertFilteredCorrectly(page, seededReports, DEFAULT_STATUS_FILTER);
    });

    test('resets to first page when applying a post filter from a non-first page', async ({
      page,
    }) => {
      await goToPage(page, 2);
      await expect(page).toHaveURL(
        new RegExp(`pageOffset=${PAGINATION.REPORTS.DEFAULT_ITEMS_PER_PAGE}`),
      );

      const postId = await filterByPostInRow(
        page,
        PAGINATION.REPORTS.DEFAULT_ITEMS_PER_PAGE,
      );

      await expect(page).not.toHaveURL(
        new RegExp(`pageOffset=${PAGINATION.REPORTS.DEFAULT_ITEMS_PER_PAGE}`),
      );

      const expectedReports = seededReports.filter(
        (r) =>
          r.reportedComment.postId === postId &&
          DEFAULT_STATUS_FILTER.includes(r.status),
      );

      await assertFilteredCorrectly(
        page,
        expectedReports,
        DEFAULT_STATUS_FILTER,
        undefined,
        postId,
      );
    });
  });
});
