import type { Report, User } from '@dans-coding-world/prisma-schema';
import { test, expect } from '../../fixtures/dbFixture';
import type { Page } from '../../fixtures/dbFixture';
import posts from '../../fixtures/posts/pagination-template.json' with { type: 'json' };
import {
  selectReportSorting,
  SORT_LABELS,
} from '../../helpers/reports-actions.helper';
import {
  checkIfLoggedIn,
  loginAsRandomUser,
} from '../../helpers/user-login.helper';
import { waitOutLoader } from '../../helpers/loading.helper';
import { PAGINATION } from '@dans-coding-world/shared-constants';
import { generateRandomComments } from '@dans-coding-world/shared-post-testing';
import { randomSelect, range } from '@dans-coding-world/helpers';
import { generateRandomCommentReports } from '@dans-coding-world/shared-report-testing';
import type { ReportDetail } from '@dans-coding-world/report-data-access';

async function checkIfSortedCorrectly(
  page: Page,
  reports: Report[],
  field: 'createdAt',
  order: 'asc' | 'desc',
) {
  const sorted = [...reports].sort((prev, next) => {
    const prevDate = new Date(prev[field] as Date).getTime();
    const nextDate = new Date(next[field] as Date).getTime();
    return order === 'desc' ? nextDate - prevDate : prevDate - nextDate;
  });

  for (let i = 0; i < sorted.length; i++) {
    const row = page.getByLabel(new RegExp(`row entry #${i + 1}$`, 'i'));
    await expect(row).toContainText(sorted[i].reason);
  }
  return true;
}

test.describe('Comment reports page - sorting', () => {
  let seededReports: Report[] = [];
  let users: User[] = [];

  test.beforeAll(async ({ db }) => {
    const seededUsers = await db.seedUsers({
      users: null,
      options: { clearExisting: true, useDefaults: true },
    });

    const [seededPost] = await db.seedPosts({
      posts,
      options: { useDefaults: false, clearExisting: true },
    });

    if (!seededPost) {
      throw new Error('Missing post fixture');
    }

    users = seededUsers;
    const numOfComments = PAGINATION.REPORTS.DEFAULT_ITEMS_PER_PAGE;

    const commentsToSeed = generateRandomComments(1, numOfComments);

    const seededComments = await db.seedComments({
      comments: commentsToSeed.map((c) => ({
        id: c.id,
        threadParentId: null,
        content: c.content,
        createdAt: c.createdAt,
        depth: c.depth,
        updatedAt: c.updatedAt,
        postId: seededPost.id,
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
        status: 'PENDING',
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

  test.beforeEach(async ({ page }) => {
    await loginAsRandomUser(
      page,
      users.filter((u) => u.role === 'ADMIN'),
    );
    expect(await checkIfLoggedIn(page)).toBe(true);
    await page.goto('/reports/comments');
    await waitOutLoader(page);
  });

  test('sorts posts by "Created (desc)" by default', async ({ page }) => {
    const table = page.getByRole('table');
    const sortElement = table.getByLabel(/sort by:/i);
    await expect(sortElement).toHaveValue(/desc/i);
    await expect(sortElement).toContainText(SORT_LABELS[0]);

    await checkIfSortedCorrectly(page, seededReports, 'createdAt', 'desc');
  });

  test.describe('post sorting', () => {
    test('sorts by Created asc', async ({ page }) => {
      await selectReportSorting(page, 'Created (asc)');
      expect(
        await checkIfSortedCorrectly(page, seededReports, 'createdAt', 'asc'),
      ).toBeTruthy();
    });

    test('sorts by Created desc', async ({ page }) => {
      await selectReportSorting(page, 'Created (desc)');
      expect(
        await checkIfSortedCorrectly(page, seededReports, 'createdAt', 'desc'),
      ).toBeTruthy();
    });
  });
});
