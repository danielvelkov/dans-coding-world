/* eslint-disable playwright/no-conditional-in-test */
import type { Role, User } from '@dans-coding-world/prisma-schema';
import posts from '../../fixtures/posts/pagination-template.json' with { type: 'json' };
import {
  formatDateTo_DD_MM_YYYY,
  randomSelect,
  range,
} from '@dans-coding-world/helpers';
import { ERROR_CODES, PAGINATION } from '@dans-coding-world/shared-constants';
import { test, expect, type Page } from '../../fixtures/dbFixture';
import {
  checkIfLoggedIn,
  checkIfLoggedOut,
  login,
  loginAsRandomUser,
  logout,
} from '../../helpers/user-login.helper';
import { waitOutLoader } from '../../helpers/loading.helper';
import { ReportDetail } from '@dans-coding-world/report-data-access';
import { generateRandomComments } from '@dans-coding-world/shared-post-testing';
import { generateRandomCommentReports } from '@dans-coding-world/shared-report-testing';
import {
  expandReportRow,
  getReportRow,
  selectReportFilter,
} from '../../helpers/reports-actions.helper';
import { API_ENDPOINTS } from '@dans-coding-world/shared-data-access-api';
import { generateErrorResponseByErrorCode } from '@dans-coding-world/api-exceptions';

const publicBlogHost = process.env['VITE_PUBLIC_BLOG_HOST'];
const publicBlogPort = process.env['VITE_PUBLIC_BLOG_PORT'];
if (!publicBlogHost || !publicBlogPort)
  throw new Error('Missing env variables');

const blogURL = `http://${publicBlogHost}:${publicBlogPort}`;

function getVisibleReportsForUser(
  reports: ReportDetail[],
  limit = PAGINATION.REPORTS.DEFAULT_ITEMS_PER_PAGE,
) {
  return [...reports]
    .sort(
      (a, b) =>
        new Date(b.createdAt as Date).getTime() -
        new Date(a.createdAt as Date).getTime(),
    )
    .slice(0, limit);
}

async function assertRowContainsReportInfo(
  page: Page,
  report: ReportDetail,
  rowIndex: number,
) {
  const row = getReportRow(page, rowIndex);

  await expect(row).toContainText(report.reason);
  await expect(row).toContainText(report.status.toUpperCase());

  await expect(row).toContainText(
    formatDateTo_DD_MM_YYYY(new Date(report.createdAt)),
  );

  return true;
}

test.describe('Comment reports page', () => {
  let users: User[] = [];
  let seededReports: ReportDetail[] = [];

  test.beforeAll(async ({ db }) => {
    users = await db.seedUsers({
      users: null,
      options: { clearExisting: true, useDefaults: true },
    });

    const mod = users.find((u) => u.role === 'MOD');
    if (!mod) throw new Error('Missing moderator fixture');

    const [seededPost] = await db.seedPosts({
      posts,
      options: { useDefaults: false, clearExisting: true },
    });

    if (!seededPost) {
      throw new Error('Missing post fixture');
    }

    const numOfComments = PAGINATION.REPORTS.DEFAULT_ITEMS_PER_PAGE + 1;

    const commentsToSeed = generateRandomComments(1, numOfComments);

    const seededComments = await db.seedComments({
      comments: commentsToSeed.map((c, i) => ({
        id: c.id,
        threadParentId: null,
        content: c.content,
        createdAt: c.createdAt,
        depth: c.depth,
        updatedAt: c.updatedAt,
        postId: seededPost.id,
        userId: i === 0 ? mod.id : randomSelect(users.map((u) => u.id)), // ensure first comment is made by mod
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
      const dateWithOffset = new Date(seededPost.createdAt as Date);
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
        status: i === 1 ? 'REVIEWING' : 'PENDING',
      };
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

  test('shows 401 UNAUTHORIZED when not logged in', async ({ page }) => {
    await page.goto('/reports/comments');
    await waitOutLoader(page);
    await expect(page.getByText(/401/i)).toBeVisible();
    await expect(page.getByText(/authentication required/i)).toBeVisible();
  });

  test.describe('Authenticated MOD/ADMIN', () => {
    const allowedRoles: Role[] = ['ADMIN', 'MOD'];
    let loggedInUser: User;

    test.beforeEach(async ({ page }) => {
      loggedInUser = await loginAsRandomUser(
        page,
        users.filter((u) => allowedRoles.includes(u.role)),
      );
      await waitOutLoader(page);
      expect(await checkIfLoggedIn(page)).toBe(true);
      await page.goto('/reports/comments');
      await waitOutLoader(page);
    });

    test('contains "Reports" heading with table containing results', async ({
      page,
    }) => {
      await expect(page.locator('h2')).toContainText('Reports');
      await expect(page.getByRole('table')).toBeVisible();
    });

    test('each row contains main information about report', async ({
      page,
    }) => {
      const visibleReports = getVisibleReportsForUser(seededReports);

      for (let i = 0; i < visibleReports.length; i++) {
        expect(
          await assertRowContainsReportInfo(page, visibleReports[i], i),
        ).toBe(true);
      }
    });

    test('clicking "expand row" shows report preview details', async ({
      page,
    }) => {
      const visibleReports = getVisibleReportsForUser(seededReports);
      const report = visibleReports[0];

      await expandReportRow(page, 0);

      const expandedRow = page.getByTestId(`row-details-${report.id}`);

      await expect(expandedRow.getByText(`ID: ${report.id}`)).toBeVisible();

      await expect(expandedRow.getByText(report.reason)).toBeVisible();

      await expect(
        expandedRow.getByText(report.reportedComment.content),
      ).toBeVisible();

      await expect(
        expandedRow.getByText(
          new RegExp(`User #${report.reportedComment.userId.toString()}$`, 'i'),
        ),
      ).toBeVisible();

      await expect(
        expandedRow.getByText(
          new RegExp(`User #${report.reporterId.toString()}$`, 'i'),
        ),
      ).toBeVisible();
    });

    test(`expanded row details contains "View post" link which 
      opens a new tab with the post in the public blog`, async ({ page }) => {
      const visibleReports = getVisibleReportsForUser(seededReports);
      const report = visibleReports.find(
        (r) => r.reportedComment.userId !== loggedInUser.id,
      );
      if (!report) throw new Error('Missing report fixture');

      const rowIndex = visibleReports.indexOf(report);

      await expandReportRow(page, rowIndex);

      const expandedRow = page.getByTestId(`row-details-${report.id}`);
      const [popup] = await Promise.all([
        page.waitForEvent('popup'),
        expandedRow.getByRole('link', { name: /view.*post/i }).click(),
      ]);

      await popup.waitForLoadState('domcontentloaded');
      expect(popup.url()).toBe(
        `${blogURL}/blog/${report.reportedComment.postId}`,
      );
    });

    test(`selecting "View" link in "Actions" column navigates to report's page`, async ({
      page,
    }) => {
      const visibleReports = getVisibleReportsForUser(seededReports);
      const report = visibleReports.find(
        (r) => r.reportedComment.userId !== loggedInUser.id,
      );
      if (!report) throw new Error('Missing report fixture');

      const rowIndex = visibleReports.indexOf(report);

      const reportRow = getReportRow(page, rowIndex);

      await reportRow.getByRole('link', { name: /view$/i }).click();

      await expect(page).toHaveURL(
        new RegExp(`/reports/comments/${report.id}$`),
      );
    });

    test.describe('Logged in as MOD', () => {
      test.beforeEach(async ({ page }) => {
        await logout(page);
        await checkIfLoggedOut(page);
        await loginAsRandomUser(
          page,
          users.filter((u) => u.role === 'MOD'),
        );
        await waitOutLoader(page);
        expect(await checkIfLoggedIn(page)).toBe(true);
        await page.goto('/reports/comments');
        await waitOutLoader(page);
      });

      test('disables actions if report is about a comment the mod made', async ({
        page,
      }) => {
        const modId = users.find((u) => u.role === 'MOD')!.id;
        await page.goto('/reports/comments?filterBy[maliciousUserId]=' + modId);
        await selectReportFilter(page, ['REVIEWING']);

        // Should be only report made about  the mod and it will have status 'REVIEWING'
        await expect(
          getReportRow(page, 0).getByRole('link', {
            name: /view/i,
          }),
        ).toBeDisabled();
      });
    });

    test.describe('Report deletion', () => {
      test.describe('Logged in as MOD', () => {
        test.beforeEach(async ({ page }) => {
          await logout(page);
          await checkIfLoggedOut(page);
          await loginAsRandomUser(
            page,
            users.filter((u) => u.role === 'MOD'),
          );
          await waitOutLoader(page);
          expect(await checkIfLoggedIn(page)).toBe(true);
          await page.goto('/reports/comments');
          await waitOutLoader(page);
        });

        test('does not show "Delete" action if logged in as MOD', async ({
          page,
        }) => {
          await expect(
            getReportRow(page, 0).getByRole('button', {
              name: /delete/i,
            }),
          ).toHaveCount(0);
        });
      });

      test.describe('Logged in as ADMIN', () => {
        test.beforeEach(async ({ page }) => {
          await logout(page);
          await checkIfLoggedOut(page);
          await loginAsRandomUser(
            page,
            users.filter((u) => u.role === 'ADMIN'),
          );
          await waitOutLoader(page);
          expect(await checkIfLoggedIn(page)).toBe(true);
          await page.goto('/reports/comments');
          await waitOutLoader(page);
        });

        test('shows "Delete" action if logged in as ADMIN', async ({
          page,
        }) => {
          await expect(
            getReportRow(page, 0).getByRole('button', { name: /delete/i }),
          ).toBeVisible();
        });

        test(`deleting a report optimistically removes it but on failure to delete,
            it shows error and returns report to results`, async ({ page }) => {
          test.slow();

          const visibleReports = getVisibleReportsForUser(seededReports);
          const report = visibleReports[0];

          const errorMessage = 'Failed to delete report';

          await page.route(
            `**${API_ENDPOINTS.REPORTS.COMMENTS.BY_ID(report.id)}**`,
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

          await getReportRow(page, 0)
            .getByRole('button', { name: /delete report/i })
            .click();

          const dialog = page.getByRole('dialog');

          await expect(dialog).toBeVisible();

          await dialog.getByRole('button', { name: /delete report/i }).click();

          await expect(
            getReportRow(page, 0).getByText(report.reason),
          ).not.toBeInViewport();

          const error = page.getByTestId('deletion-error-message');

          await error.waitFor({
            state: 'visible',
            timeout: 30000,
          });

          await expect(error.getByText(errorMessage)).toBeVisible();

          await expect(page.getByText(report.reason)).toBeVisible();
        });

        test(`clicking "Delete" opens confirmation dialog,
          which upon confirmation successfully removes report`, async ({
          page,
        }) => {
          const visibleReports = getVisibleReportsForUser(seededReports);
          const report = visibleReports[0];

          await getReportRow(page, 0)
            .getByRole('button', { name: /delete report/i })
            .click();

          const dialog = page.getByRole('dialog');

          await expect(dialog).toBeVisible();

          await dialog.getByRole('button', { name: /delete report/i }).click();

          await expect(page.getByText(report.reason)).not.toBeInViewport();
          await expect(page.getByText(/report.*deleted/i)).toBeVisible();
        });
      });
    });
  });

  test.describe('Logged in as User/Author', () => {
    const allowedRoles: Role[] = ['USER', 'AUTHOR'];
    test.beforeEach(async ({ page }) => {
      const user = users.find((u) => allowedRoles.includes(u.role));
      if (!user) throw new Error('Missing fixture');
      await page.goto('/login');
      await login(page, user.email, user.password);
      expect(await checkIfLoggedIn(page)).toBe(true);
    });

    test('shows 403 FORBIDDEN when trying to navigate to page', async ({
      page,
    }) => {
      await page.goto(`/reports/comments`);
      await expect(page.getByText(/403/i)).toBeVisible();
      await expect(
        page.getByText(/(access denied|do not have permission)/i),
      ).toBeVisible();
    });
  });
});
