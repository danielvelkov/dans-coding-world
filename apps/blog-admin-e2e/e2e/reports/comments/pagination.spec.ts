/* eslint-disable playwright/no-conditional-in-test */
import type { Report, User } from '@dans-coding-world/prisma-schema';
import { range, chunk, shuffle } from '@dans-coding-world/helpers';
import { PAGINATION } from '@dans-coding-world/shared-constants';
import { API_ENDPOINTS } from '@dans-coding-world/shared-data-access-api';
import { generateRandomComments } from '@dans-coding-world/shared-post-testing';
import {
  generateMockCommentReportsResponse,
  generateRandomCommentReports,
} from '@dans-coding-world/shared-report-testing';
import { test, expect } from '../../fixtures/dbFixture';
import postJson from '../../fixtures/posts/pagination-template.json' with { type: 'json' };
import {
  goToPage,
  clickNextPage,
  clickPrevPage,
  selectRowEntriesPerPage,
} from '../../helpers/pagination.helper';
import {
  checkIfLoggedIn,
  loginAsRandomUser,
} from '../../helpers/user-login.helper';

test.describe('Comment reports page - pagination', () => {
  let users: User[] = [];
  let seededReports: Report[];

  test.beforeAll(async ({ db }) => {
    users = await db.seedUsers({
      users: null,
      options: { clearExisting: true, useDefaults: true },
    });

    const admin = users.find((u) => u.role === 'ADMIN');
    const user = users.find((u) => u.role === 'USER');
    if (!admin || !user) throw new Error('Missing test user');

    const postTemplate = postJson[0];

    const [seededPost] = await db.seedPosts({
      posts: [{ ...postTemplate, authorId: admin.id }],
      options: {
        useDefaults: false,
        clearExisting: true,
      },
    });

    if (!seededPost) {
      throw new Error('Missing post fixtures');
    }

    const numOfComments =
      Math.floor(
        Math.random() * (PAGINATION.REPORTS.ITEMS_PER_PAGE_OPTIONS[2] * 2 + 1),
      ) + PAGINATION.REPORTS.ITEMS_PER_PAGE_OPTIONS[2];
    const commentsToSeed = generateRandomComments(seededPost.id, numOfComments);

    const seededComments = await db.seedComments({
      comments: commentsToSeed.map((c) => ({
        id: c.id,
        threadParentId: null,
        content: c.content,
        createdAt: c.createdAt,
        depth: c.depth,
        updatedAt: c.updatedAt,
        postId: seededPost.id,
        userId: user.id,
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
      const dateWithOffset = postTemplate.publishedAt
        ? new Date(postTemplate.publishedAt)
        : postTemplate.publishedAt;
      (dateWithOffset as Date)?.setUTCDate(
        (dateWithOffset as Date).getUTCDate() + i,
      );
      return {
        id: i,
        createdAt: dateWithOffset,
        reason: mockReports[i - 1].reason,
        commentId: seededComments[i - 1].id,
        reporterId: admin.id,
        status: 'PENDING', // easier to test as default filter is "PENDING"
      } as Report;
    });

    seededReports = await db.seedReports({
      reports: reportsToSeed,
      options: {
        useDefaults: false,
        clearExisting: true,
      },
    });

    // Sort by default order: createdAt desc
    seededReports.sort((prev, next) => {
      const prevDate = new Date(prev.createdAt as Date);
      const nextDate = new Date(next.createdAt as Date);
      return nextDate.getTime() - prevDate.getTime();
    });
  });

  test.describe('Element', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsRandomUser(
        page,
        users.filter((u) => u.role === 'ADMIN' || u.role === 'MOD'),
      );
      expect(await checkIfLoggedIn(page)).toBe(true);
    });

    test('shows up when there are more results than the default page size', async ({
      page,
    }) => {
      await page.route(`**${API_ENDPOINTS.REPORTS.COMMENTS.LIST}**`, (route) =>
        route.fulfill({
          json: generateMockCommentReportsResponse({
            length: PAGINATION.REPORTS.DEFAULT_ITEMS_PER_PAGE * 2,
            pageSize: PAGINATION.REPORTS.DEFAULT_ITEMS_PER_PAGE,
          }),
        }),
      );

      await page.goto('/reports/comments');
      await expect(page.getByLabel('pagination')).toBeVisible();
    });

    test('is not displayed when results fit on 1 page', async ({ page }) => {
      const numOfTestReports =
        Math.floor(
          Math.random() * (PAGINATION.REPORTS.DEFAULT_ITEMS_PER_PAGE - 1),
        ) + 1;
      await page.route(`**${API_ENDPOINTS.REPORTS.COMMENTS.LIST}**`, (route) =>
        route.fulfill({
          json: generateMockCommentReportsResponse({
            length: numOfTestReports,
            pageSize: PAGINATION.REPORTS.DEFAULT_ITEMS_PER_PAGE,
          }),
        }),
      );

      await page.goto('/reports/comments');
      await expect(page.getByLabel(/expand details/i)).toHaveCount(
        numOfTestReports,
      );
      await expect(page.getByLabel('pagination')).toBeHidden();
    });

    test('displays correct number of page buttons', async ({ page }) => {
      const expectedPages = 4;
      const pageSize = PAGINATION.REPORTS.DEFAULT_ITEMS_PER_PAGE;

      await page.route(`**${API_ENDPOINTS.REPORTS.COMMENTS.LIST}**`, (route) =>
        route.fulfill({
          json: generateMockCommentReportsResponse({
            length: expectedPages * pageSize,
            pageSize,
          }),
        }),
      );

      await page.goto('/reports/comments');

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
        users.filter((u) => u.role === 'ADMIN' || u.role === 'MOD'),
      );
      expect(await checkIfLoggedIn(page)).toBe(true);
      await page.goto('/reports/comments');
    });

    test('navigates to next page of results on clicking "next"', async ({
      page,
    }) => {
      const pagesWithReportsArray = chunk(
        seededReports,
        PAGINATION.REPORTS.DEFAULT_ITEMS_PER_PAGE,
      );
      const numOfPages = pagesWithReportsArray.length;

      for (let i = 0; i < numOfPages; i++) {
        for (const report of pagesWithReportsArray[i]) {
          await expect(page.getByText(report.reason)).toBeVisible();
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
        seededReports.length / PAGINATION.REPORTS.DEFAULT_ITEMS_PER_PAGE,
      );
      await goToPage(page, lastPage);

      await expect(page.getByLabel('next page')).toBeDisabled();
      await expect(page.getByLabel('prev page')).toBeEnabled();
    });

    test('navigates to previous page on clicking "prev"', async ({ page }) => {
      const pagesWithReportsArray = chunk(
        seededReports,
        PAGINATION.REPORTS.DEFAULT_ITEMS_PER_PAGE,
      );
      const numOfPages = pagesWithReportsArray.length;

      await goToPage(page, numOfPages);

      for (let i = numOfPages - 1; i >= 0; i--) {
        for (const report of pagesWithReportsArray[i]) {
          await expect(page.getByText(report.reason)).toBeVisible();
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
      const pagesWithReportsArray = chunk(
        seededReports,
        PAGINATION.REPORTS.DEFAULT_ITEMS_PER_PAGE,
      );
      const numOfPages = pagesWithReportsArray.length;
      const randomPages = shuffle(range(numOfPages));

      for (const randomPage of randomPages) {
        await goToPage(page, randomPage);
        for (const report of pagesWithReportsArray[randomPage - 1]) {
          await expect(page.getByText(report.reason)).toBeVisible();
        }
      }
    });

    test.describe('with different entries per page selected', () => {
      test('shows the right amount of reports', async ({ page }) => {
        for (const pageSize of PAGINATION.REPORTS.ITEMS_PER_PAGE_OPTIONS) {
          await selectRowEntriesPerPage(page, pageSize);
          await expect(page.getByLabel(/expand details/i)).toHaveCount(
            pageSize,
          );
        }
      });

      test('show correct row entry numbering', async ({ page }) => {
        // this test is slow so the function call below triples timeout
        test.slow();
        for (const pageSize of PAGINATION.REPORTS.ITEMS_PER_PAGE_OPTIONS) {
          await selectRowEntriesPerPage(page, pageSize);
          const expectedPages = Math.ceil(seededReports.length / pageSize);
          for (let pageIndex = 1; pageIndex <= expectedPages; pageIndex++) {
            const pagination = page.getByLabel('pagination');
            await pagination
              .getByRole('button', { name: `page ${pageIndex}`, exact: true })
              .click();

            const start = (pageIndex - 1) * pageSize + 1;
            const end =
              pageIndex === expectedPages
                ? seededReports.length
                : pageIndex * pageSize;
            await expect(
              page.getByText(
                `Showing ${start} - ${end} of ${seededReports.length} entries`,
              ),
            ).toBeVisible();

            for (const entryIndex of Array.from({ length: pageSize }).map(
              (_, i) => i + 1,
            )) {
              const rowEntryIndex = (pageIndex - 1) * pageSize + entryIndex;
              if (rowEntryIndex > seededReports.length) break;
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
        for (const pageSize of PAGINATION.REPORTS.ITEMS_PER_PAGE_OPTIONS) {
          await selectRowEntriesPerPage(page, pageSize);
          const expectedPages = Math.ceil(seededReports.length / pageSize);
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
      for (const pageSize of PAGINATION.REPORTS.ITEMS_PER_PAGE_OPTIONS) {
        test(`shows correct results for page size ${pageSize}`, async ({
          page,
        }) => {
          await selectRowEntriesPerPage(page, pageSize);

          const pagesWithReportsArray = chunk(seededReports, pageSize);
          const numOfPages = pagesWithReportsArray.length;

          for (let pageIndex = 1; pageIndex <= numOfPages; pageIndex++) {
            await goToPage(page, pageIndex);

            for (const report of pagesWithReportsArray[pageIndex - 1]) {
              await expect(
                page.getByText(report.reason, { exact: true }),
              ).toBeVisible();
            }
          }
        });
      }
    });
  });
});
