/* eslint-disable playwright/expect-expect */
/* eslint-disable playwright/no-conditional-expect */
/* eslint-disable playwright/no-conditional-in-test */
import type {
  Post,
  User,
  Report,
  Role,
} from '@dans-coding-world/prisma-schema';
import { test, expect } from '../../fixtures/dbFixture';
import type { Page } from '../../fixtures/dbFixture';
import {
  checkIfLoggedIn,
  login,
  loginAsRandomUser,
} from '../../helpers/user-login.helper';
import {
  ERROR_CODES,
  ERROR_MESSAGES,
  PAGINATION,
} from '@dans-coding-world/shared-constants';
import {
  randomSelect,
  range,
  formatDateTo_DD_MMM_YYYY,
  formatToRelativeTimeFromDate,
} from '@dans-coding-world/helpers';
import { waitOutLoader } from '../../helpers/loading.helper';
import { API_ENDPOINTS } from '@dans-coding-world/shared-data-access-api';
import { generateErrorResponseByErrorCode } from '@dans-coding-world/exceptions';
import type { ReportDetailExtended } from '@dans-coding-world/report-data-access';
import { generateRandomUser } from '@dans-coding-world/shared-user-testing';
import { generateRandomComments } from '@dans-coding-world/shared-post-testing';
import { generateRandomCommentReports } from '@dans-coding-world/shared-report-testing';

const publicBlogHost = process.env['VITE_PUBLIC_BLOG_HOST'];
const publicBlogPort = process.env['VITE_PUBLIC_BLOG_PORT'];
if (!publicBlogHost || !publicBlogPort)
  throw new Error('Missing env variables');

const blogURL = `http://${publicBlogHost}:${publicBlogPort}`;

async function visitReport(page: Page, id: number) {
  await page.goto(`/reports/comments/${id}`);
}

const STATUSES = ['DISMISSED', 'PENDING', 'RESOLVED', 'REVIEWING'];

test.describe('Comment reports page - details', () => {
  let users: User[] = [];
  let seededPosts: Post[] = [];
  let seededReports: ReportDetailExtended[] = [];
  let loggedInUser: User;

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
        id: mockReports[i - 1].id,
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
          reportedBy: users.find((u) => u.id === r.reporterId),
        }) as ReportDetailExtended,
    );

    // Sort by default order: createdAt desc
    seededReports.sort((prev, next) => {
      const prevDate = new Date(prev.createdAt as Date);
      const nextDate = new Date(next.createdAt as Date);
      return nextDate.getTime() - prevDate.getTime();
    });

    const mockReportHistories = mockReports.flatMap((r) => {
      const history = r.history;
      for (const entry of history)
        entry.moderatorId = randomSelect(
          users.filter((u) => u.role === 'MOD' || u.role === 'ADMIN'),
        ).id;
      return history;
    });

    const reportHistories = await db.seedReportHistories({
      reportHistories: mockReportHistories,
      options: {
        useDefaults: false,
        clearExisting: true,
      },
    });

    for (const historyEntry of reportHistories) {
      const report = seededReports.find((r) => r.id === historyEntry.reportId)!;
      const index = seededReports.indexOf(report);
      seededReports[index].history = [
        ...(seededReports[index].history ?? []),
        {
          ...historyEntry,
          moderator: users.find((u) => u.id === historyEntry.moderatorId),
        },
      ] as ReportDetailExtended['history'];
    }
  });

  test.describe('Logged in as MOD/ADMIN', () => {
    const allowedRoles = ['ADMIN', 'MOD'];
    let selectedReport: ReportDetailExtended;
    let loggedInUser: User;

    test.beforeEach(async ({ page }) => {
      loggedInUser = await loginAsRandomUser(
        page,
        users.filter((u) => allowedRoles.includes(u.role)),
      );
      await waitOutLoader(page);
      expect(await checkIfLoggedIn(page)).toBe(true);
      selectedReport = randomSelect(
        seededReports.filter(
          (r) => r.reportedComment.userId !== loggedInUser.id,
        ),
      );
      visitReport(page, selectedReport.id);
      await page.waitForEvent('load');
      await waitOutLoader(page);
    });

    test('shows 500 generic error message if invalid report id in URL', async ({
      page,
    }) => {
      await page.goto(`/reports/comments/abc`);
      await waitOutLoader(page);
      await expect(page.getByText(/500/i)).toBeVisible();
      await expect(page.getByText(/invalid report id/i)).toBeVisible();
    });

    test('shows 404 "Not Found" error if report does not exist', async ({
      page,
    }) => {
      await visitReport(page, 9999);
      await waitOutLoader(page);
      await expect(page.getByText(/404/i)).toBeVisible();
      await expect(page.getByText(/not found/i)).toBeVisible();
    });

    test('contains "Report" heading with report ID', async ({ page }) => {
      await expect(
        page.getByRole('heading', { name: /report$/i }),
      ).toBeVisible();
      await expect(
        page.getByText(new RegExp(`ID: ${selectedReport.id}`, 'i')),
      ).toBeVisible();
    });

    test.describe('Section of the reported comment', () => {
      test('contains "Report" details like comment, reported user and status', async ({
        page,
      }) => {
        const commentAuthor = users.find(
          (u) => u.id === selectedReport.reportedComment.userId,
        )!;
        await expect(
          page.getByText(selectedReport.reportedComment.content),
        ).toBeVisible();
        await expect(
          page.getByText(new RegExp(`made by: ${commentAuthor.username}`, 'i')),
        ).toBeVisible();
        await expect(
          page.getByText(
            new RegExp(`current status: ${selectedReport.status}`, 'i'),
          ),
        ).toBeVisible();
      });

      test(`selecting "View post" link opens a new tab with the post in the public blog`, async ({
        page,
      }) => {
        const [popup] = await Promise.all([
          page.waitForEvent('popup'),
          page.getByRole('link', { name: /view live post/i }).click(),
        ]);

        await popup.waitForLoadState('domcontentloaded');
        expect(popup.url()).toBe(
          `${blogURL}/blog/${selectedReport.reportedComment.postId}`,
        );
      });

      test(`selecting reported user navigates to comment reports page and shows all reports made about him`, async ({
        page,
      }) => {
        await page.getByLabel(/see more reports about user/i).click();
        await expect(page).toHaveURL(new RegExp(`/reports/comments`));
      });
    });

    test.describe('Report history section', () => {
      test('displays report history entries with correct status transitions and mod details', async ({
        page,
      }) => {
        const historyContainer = page.getByTestId('history-container');

        await expect(historyContainer).toBeVisible();

        for (const entry of selectedReport.history) {
          const entryContainer = historyContainer.getByTestId(
            'entry-' + entry.id,
          );
          if (entry.note)
            await expect(entryContainer.getByText(entry.note)).toBeVisible();

          await expect(
            entryContainer.getByText(new RegExp(entry.moderator.username, 'i')),
          ).toBeVisible();

          await expect(
            entryContainer.getByText(new RegExp(`^${entry.newStatus}$`, 'i')),
          ).toBeVisible();

          await expect(
            entryContainer.getByText(
              new RegExp(
                `^${formatToRelativeTimeFromDate(new Date(entry.changedAt), new Date())}$`,
                'i',
              ),
            ),
          ).toBeVisible();

          if (entry.previousStatus) {
            await expect(
              entryContainer.getByText(
                new RegExp(`^${entry.previousStatus}$`, 'i'),
              ),
            ).toBeVisible();
          }
        }
      });

      test(`shows the report submission as the first history entry with creation time as DD_MMM_YYYY`, async ({
        page,
      }) => {
        const historyContainer = page.getByTestId('history-container');
        const entryContainer = historyContainer.getByTestId('entry-0');

        await expect(entryContainer.getByText('PENDING')).toBeVisible();
        await expect(
          entryContainer.getByText(selectedReport.reportedBy.username),
        ).toBeVisible();
        await expect(
          entryContainer.getByText(new RegExp(selectedReport.reason, 'i')),
        ).toBeVisible();
        await expect(
          entryContainer.getByText(
            new RegExp(
              formatDateTo_DD_MMM_YYYY(new Date(selectedReport.createdAt)),
              'i',
            ),
          ),
        ).toBeVisible();
      });
    });

    test.describe('Moderation actions section', () => {
      test.describe('Update status', () => {
        test(`contains change status actions with the action correlating to the current status being disabled`, async ({
          page,
        }) => {
          for (const status of STATUSES) {
            if (selectedReport.status === status)
              await expect(page.getByTestId(`action-${status}`)).toBeDisabled();
            else
              await expect(page.getByTestId(`action-${status}`)).toBeEnabled();
          }
        });

        test('updates report status and appends entry to report history', async ({
          page,
        }) => {
          const targetStatus = STATUSES.find(
            (s) => s !== selectedReport.status,
          )!;

          await page.getByTestId(`action-${targetStatus}`).click();
          const dialog = page.getByRole('dialog');

          await expect(dialog).toBeVisible();
          await dialog
            .getByRole('button', {
              name: /confirm/i,
            })
            .click();

          await expect(
            page.getByText(
              new RegExp(`report.*${selectedReport.id}.*saved`, 'i'),
            ),
          ).toBeVisible();

          await expect(
            page.getByText(new RegExp(`current status: ${targetStatus}`, 'i')),
          ).toBeVisible();

          const historyContainer = page.getByTestId('history-container');
          await expect(historyContainer.getByTestId(/entry-\d+/)).toHaveCount(
            selectedReport.history?.length ??
              0 +
                1 + // the report reason itself is an entry
                1, // the new entry
          );
        });
      });

      test.describe('Delete comment', () => {
        test('has "delete comment" action which on click opens confirmation dialog', async ({
          page,
        }) => {
          await page
            .getByRole('button', {
              name: /delete comment/i,
            })
            .click();
          const dialog = page.getByRole('dialog');

          await expect(dialog).toBeVisible();
          await expect(
            dialog.getByRole('button', {
              name: /delete comment/i,
            }),
          ).toBeVisible();
        });

        test(`confirming "Delete" dialog removes comment (including report), navigates to reports page and shows toast notification`, async ({
          page,
        }) => {
          const reportAboutAnotherUser = randomSelect(
            seededReports.filter(
              (r) =>
                r.id !== selectedReport.id &&
                r.reportedComment.userId !== loggedInUser.id,
            ),
          );
          await page.goto(`/reports/comments/${reportAboutAnotherUser.id}`);
          await page
            .getByRole('button', {
              name: /delete comment/i,
            })
            .click();
          const dialog = page.getByRole('dialog');

          await dialog
            .getByRole('button', {
              name: /delete comment/i,
            })
            .click();
          await waitOutLoader(page, 'Deleting...');
          await expect(page).toHaveURL(new RegExp(`/reports/comments$`));
          await expect(
            page.getByText(/comment.*and report.*deleted/i),
          ).toBeVisible();

          await page.goto(`/reports/comments/${reportAboutAnotherUser.id}`);
          await expect(page.getByText(/404/i)).toBeVisible();
          await expect(page.getByText(/not found/i)).toBeVisible();

          // remove it from the seed data
          seededReports = seededReports.filter(
            (r) => r.id !== reportAboutAnotherUser.id,
          );
        });

        test('shows error message and closes dialog if comment deletion fails', async ({
          page,
        }) => {
          const message = 'Failed to delete comment.';
          const errorResponse = generateErrorResponseByErrorCode(
            ERROR_CODES.SERVER.FORBIDDEN,
            undefined,
            message,
          );

          await page.route(
            `**${API_ENDPOINTS.COMMENTS.BY_ID(selectedReport.reportedComment.postId, selectedReport.reportedComment.id)}**`,
            (route) =>
              route.fulfill({
                status: 401,
                json: errorResponse,
              }),
          );

          await page
            .getByRole('button', {
              name: /delete comment/i,
            })
            .click();
          const dialog = page.getByRole('dialog');
          await expect(dialog).toBeVisible();

          await dialog
            .getByRole('button', {
              name: /delete comment/i,
            })
            .click();

          await waitOutLoader(page);
          await expect(dialog).toBeHidden();
          await expect(page.getByTestId('report-error')).toContainText(message);
        });
      });

      test.describe('Ban/Unban user', () => {
        test.beforeEach(async ({ page }) => {
          // get reports about users as we test with mods and admins
          const user = users.find((u) => u.role === 'USER')!;
          selectedReport = randomSelect(
            seededReports.filter(
              (r) =>
                r.id !== selectedReport.id &&
                r.reportedComment.userId !== loggedInUser.id &&
                r.reportedComment.userId === user.id,
            ),
          );
          await page.goto(`/reports/comments/${selectedReport.id}`);
        });

        test('has action "Ban" or "Unban" depending on the ban status of the reported user', async ({
          page,
        }) => {
          const reportedUser = users.find(
            (u) => u.id === selectedReport.reportedComment.userId,
          );
          if (reportedUser?.isBanned) {
            await expect(
              page.getByRole('button', { name: /unban user/i }),
            ).toBeVisible();
          } else {
            await expect(
              page.getByRole('button', { name: /ban user/i }),
            ).toBeVisible();
          }
        });

        test('selecting Ban/Unban action opens confirmation dialog', async ({
          page,
        }) => {
          const isBanned = users.find(
            (u) => u.id === selectedReport.reportedComment.userId,
          )?.isBanned;
          if (isBanned)
            await page
              .getByRole('button', {
                name: /unban user/i,
              })
              .click();
          else
            await page
              .getByRole('button', {
                name: /ban user/i,
              })
              .click();
          const dialog = page.getByRole('dialog');

          await expect(dialog).toBeVisible();
          if (isBanned)
            await expect(dialog.getByText(/confirm unban/i)).toBeVisible();
          else await expect(dialog.getByText(/confirm ban/i)).toBeVisible();
        });

        test(`confirming "Ban/Unban" dialog changes user ban status and shows toast notification`, async ({
          page,
        }) => {
          const reportedUser = users.find(
            (u) => u.id === selectedReport.reportedComment.userId,
          )!;
          const isInitiallyBanned = reportedUser.isBanned;

          if (isInitiallyBanned) {
            await page
              .getByRole('button', {
                name: /unban user/i,
              })
              .click();
          } else {
            await page
              .getByRole('button', {
                name: /ban user/i,
              })
              .click();
          }

          const dialog = page.getByRole('dialog');
          await dialog.getByRole('button', { name: /confirm.*/i }).click();
          await waitOutLoader(page);

          await expect(
            page.getByText(
              new RegExp(
                `user.*${isInitiallyBanned ? 'unbanned' : 'banned'}`,
                'i',
              ),
            ),
          ).toBeVisible();

          if (isInitiallyBanned) {
            await expect(
              page.getByRole('button', { name: /ban user/i }),
            ).toBeVisible();
          } else {
            await expect(
              page.getByRole('button', { name: /unban user/i }),
            ).toBeVisible();
          }
          users[users.indexOf(loggedInUser)].isBanned =
            !users[users.indexOf(loggedInUser)].isBanned;
        });

        test('shows error message and closes dialog if user ban status change fails', async ({
          page,
        }) => {
          const message = 'User is missing.';
          const errorResponse = generateErrorResponseByErrorCode(
            ERROR_CODES.SERVER.NOT_FOUND,
            undefined,
            message,
          );
          await page.route(
            `**${API_ENDPOINTS.USERS.BAN(selectedReport.reportedComment.userId)}**`,
            (route) =>
              route.fulfill({
                status: 404,
                json: errorResponse,
              }),
          );
          await page
            .getByRole('button', {
              name: /ban user/i,
            })
            .click();
          const dialog = page.getByRole('dialog');
          await dialog
            .getByRole('button', {
              name: /confirm.*/i,
            })
            .click();
          await waitOutLoader(page);
          await expect(dialog).toBeHidden();
          await expect(page.getByTestId('report-error')).toContainText(message);
        });
      });
    });
  });

  test.describe('Logged in as ADMIN', () => {
    let testAdmin: User;
    let reportAboutTestAdmin: ReportDetailExtended;

    test.beforeAll(async ({ db }) => {
      const user = generateRandomUser();
      [testAdmin] = await db.seedUsers({
        users: [
          {
            email: user.email,
            id: user.id,
            isBanned: false,
            password: user.password,
            role: 'ADMIN',
            username: user.username,
          } as User,
        ],
        options: {
          clearExisting: false,
          useDefaults: false,
        },
      });

      // 1. Seed a comment written by otherAdmin
      const [commentByAdmin] = generateRandomComments(1, 1);
      const [seededComment] = await db.seedComments({
        comments: [
          {
            id: commentByAdmin.id,
            threadParentId: null,
            content: commentByAdmin.content,
            createdAt: commentByAdmin.createdAt,
            depth: commentByAdmin.depth,
            updatedAt: commentByAdmin.updatedAt,
            postId: randomSelect(seededPosts.map((p) => p.id)),
            userId: testAdmin.id,
          },
        ],
        options: {
          clearExisting: false,
          useDefaults: false,
        },
      });

      // 2. Seed a report reporting otherAdmin's comment
      const reporter = randomSelect(users.filter((u) => u.id !== testAdmin.id));
      const [mockReport] = generateRandomCommentReports(1);

      const [seededReport] = await db.seedReports({
        reports: [
          {
            id: mockReport.id,
            createdAt: new Date(),
            reason: mockReport.reason,
            commentId: seededComment.id,
            reporterId: reporter.id,
            status: 'PENDING',
          } as Report,
        ],
        options: {
          clearExisting: false,
          useDefaults: false,
        },
      });

      reportAboutTestAdmin = {
        commentId: seededComment.id,
        createdAt: seededReport.createdAt,
        id: seededReport.id,
        reason: seededReport.reason,
        reportedComment: { ...seededComment, user: testAdmin },
        reportedBy: reporter,
        history: [],
        reporterId: testAdmin.id,
        status: seededReport.status,
      };

      seededReports.push(reportAboutTestAdmin);
    });

    test.beforeEach(async ({ page }) => {
      loggedInUser = users.find((u) => u.role === 'ADMIN')!;
      if (!loggedInUser) throw new Error('Missing fixture');
      await page.goto('/login');
      await login(page, loggedInUser.email, loggedInUser.password);
      expect(await checkIfLoggedIn(page)).toBe(true);

      const randomReport = randomSelect(seededReports);
      await page.goto(`/reports/comments/${randomReport.id}`);
    });

    test(`does not see moderator actions for changing report status if admin is looking at report made about himself`, async ({
      page,
    }) => {
      const reportAboutMod = seededReports.find(
        (r) => r.reportedComment.userId === loggedInUser.id,
      );
      if (!reportAboutMod) throw new Error('Missing report about mod');

      await page.goto(`/reports/comments/${reportAboutMod.id}`);
      await waitOutLoader(page);
      for (const status of STATUSES) {
        await expect(page.getByTestId(`action-${status}`)).toBeHidden();
      }
    });

    test('has "delete report" action which on click opens confirmation dialog', async ({
      page,
    }) => {
      await page
        .getByRole('button', {
          name: /delete report/i,
        })
        .click();
      const dialog = page.getByRole('dialog');

      await expect(dialog).toBeVisible();
      await expect(dialog.getByText(/delete report/i)).toBeVisible();
    });

    test(`confirming "Delete" dialog removes report, navigates to reports page and shows toast notification`, async ({
      page,
    }) => {
      const randomReport = randomSelect(seededReports);
      await page.goto(`/reports/comments/${randomReport.id}`);
      await page
        .getByRole('button', {
          name: /delete report/i,
        })
        .click();
      const dialog = page.getByRole('dialog');

      await dialog.getByRole('button', { name: /delete.*report/i }).click();
      await waitOutLoader(page, 'Deleting...');
      await expect(page).toHaveURL(new RegExp(`/reports/comments$`));
      await expect(page.getByText(/report.*deleted/i)).toBeVisible();

      await page.goto(`/reports/comments/${randomReport.id}`);
      await expect(page.getByText(/404/i)).toBeVisible();
      await expect(page.getByText(/not found/i)).toBeVisible();
      // remove it from the seed data
      seededReports = seededReports.filter((r) => r.id !== randomReport.id);
    });

    test('can see report even if its about himself and delete it', async ({
      page,
    }) => {
      const reportAboutAdmin = seededReports.find(
        (r) => r.reportedComment.userId === loggedInUser.id,
      );
      if (!reportAboutAdmin) throw new Error('Missing report about mod');

      await page.goto(`/reports/comments/${reportAboutAdmin.id}`);
      await waitOutLoader(page);

      await page
        .getByRole('button', {
          name: /delete report/i,
        })
        .click();
      const dialog = page.getByRole('dialog');
      await dialog.getByRole('button', { name: /delete report/i }).click();
      await waitOutLoader(page);

      await page.goto(`/reports/comments/${reportAboutAdmin.id}`);
      await expect(page.getByText(/404/i)).toBeVisible();
      await expect(page.getByText(/not found/i)).toBeVisible();
      // remove it from the seed data
      seededReports = seededReports.filter((r) => r.id !== reportAboutAdmin.id);
    });

    test('shows error message and closes dialog if report deletion fails', async ({
      page,
    }) => {
      const randomReport = randomSelect(seededReports);
      const message = 'Failed to delete report.';
      const errorResponse = generateErrorResponseByErrorCode(
        ERROR_CODES.SERVER.NOT_FOUND,
        undefined,
        message,
      );

      await page.goto(`/reports/comments/${randomReport.id}`);
      await page.route(
        `**${API_ENDPOINTS.REPORTS.COMMENTS.BY_ID(randomReport.id)}**`,
        async (route) => {
          switch (route.request().method()) {
            case 'DELETE': {
              await route.fulfill({
                status: 404,
                json: errorResponse,
              });
              break;
            }
            default:
              await route.continue();
          }
        },
      );

      await page
        .getByRole('button', {
          name: /delete report/i,
        })
        .click();
      const dialog = page.getByRole('dialog');
      await dialog.getByRole('button', { name: /delete report/i }).click();

      await waitOutLoader(page);
      await expect(dialog).toBeHidden();
      await expect(page.getByTestId('report-error')).toContainText(message);
    });

    test('shows error when trying to ban another ADMIN', async ({ page }) => {
      const reportAboutAnotherAdmin = seededReports.find(
        (r) => r.reportedComment.userId === testAdmin.id,
      );
      if (!reportAboutAnotherAdmin) throw new Error('Missing report about mod');

      await page.goto(`/reports/comments/${reportAboutAnotherAdmin.id}`);
      await page
        .getByRole('button', {
          name: /ban user/i,
        })
        .click();
      const dialog = page.getByRole('dialog');
      await dialog.getByRole('button', { name: /confirm/i }).click();
      await expect(page.getByTestId('report-error')).toContainText(
        ERROR_MESSAGES[ERROR_CODES.SECURITY.ADMIN_PRIVILEGE_VIOLATION],
      );
    });

    test('shows error when trying to ban himself', async ({ page }) => {
      const admin = users.find(
        (u) => u.role === 'ADMIN' && u.id === loggedInUser.id,
      );
      if (!admin) throw new Error('Missing admin fixture');

      const reportAboutAdmin = seededReports.find(
        (r) => r.reportedComment.userId === admin.id,
      );
      if (!reportAboutAdmin) throw new Error('Missing report about mod');

      await page.goto(`/reports/comments/${reportAboutAdmin.id}`);
      await page
        .getByRole('button', {
          name: /ban user/i,
        })
        .click();
      const dialog = page.getByRole('dialog');
      await dialog.getByRole('button', { name: /confirm/i }).click();
      await expect(page.getByTestId('report-error')).toContainText(
        ERROR_MESSAGES[ERROR_CODES.SECURITY.SELF_ACTION_FORBIDDEN],
      );
    });
  });

  test.describe('Logged in as MOD', () => {
    test.beforeEach(async ({ page }) => {
      loggedInUser = users.find((u) => u.role === 'MOD')!;
      if (!loggedInUser) throw new Error('Missing fixture');
      await page.goto('/login');
      await login(page, loggedInUser.email, loggedInUser.password);
      expect(await checkIfLoggedIn(page)).toBe(true);
    });

    test('does not show delete report button', async ({ page }) => {
      const reportNotAboutMod = seededReports.find(
        (r) => r.reportedComment.userId !== loggedInUser.id,
      );

      if (!reportNotAboutMod) throw new Error('Missing report');
      await page.goto(`/reports/comments/${reportNotAboutMod.id}`);
      await expect(
        page.getByRole('button', {
          name: /delete report/i,
        }),
      ).toHaveCount(0);
    });

    test('shows 403 FORBIDDEN when trying to navigate to report made about himself', async ({
      page,
    }) => {
      const reportAboutMod = seededReports.find(
        (r) => r.reportedComment.userId === loggedInUser.id,
      );
      if (!reportAboutMod) throw new Error('Missing report about mod');

      await page.goto(`/reports/comments/${reportAboutMod.id}`);
      await expect(page.getByText(/403/i)).toBeVisible();
      await expect(
        page.getByText(/(access denied|do not have permission)/i),
      ).toBeVisible();
    });

    test('does not show "Ban user" action when reported user is MOD or ADMIN', async ({
      page,
    }) => {
      const privilegedUser = users.find(
        (u) =>
          u.id !== loggedInUser.id && (u.role === 'ADMIN' || u.role === 'MOD'),
      );
      if (!privilegedUser) throw new Error('Missing user fixture');

      const reportAboutUser = seededReports.find(
        (r) => r.reportedComment.userId === privilegedUser.id,
      );
      if (!reportAboutUser) throw new Error('Missing report about mod');

      await page.goto(`/reports/comments/${reportAboutUser.id}`);
      await expect(
        page.getByRole('button', {
          name: /ban user/i,
        }),
      ).toBeHidden();
    });
  });

  test.describe('Logged in as User/Author', () => {
    let testUser: User;
    test.beforeAll(async ({ db }) => {
      const user = generateRandomUser();
      [testUser] = await db.seedUsers({
        users: [
          {
            email: user.email,
            id: user.id,
            isBanned: false,
            password: user.password,
            role: 'USER',
            username: user.username,
          } as User,
        ],
        options: {
          clearExisting: false,
          useDefaults: false,
        },
      });
    });
    test.beforeEach(async ({ page }) => {
      await page.goto('/login');
      await login(page, testUser.email, testUser.password);
      expect(await checkIfLoggedIn(page)).toBe(true);
    });

    test('shows 403 FORBIDDEN when trying to navigate to report page', async ({
      page,
    }) => {
      const randomReportId = seededReports[0].id;
      await page.goto(`/reports/comments/${randomReportId}`);
      await expect(page.getByText(/403/i)).toBeVisible();
      await expect(
        page.getByText(/(access denied|do not have permission)/i),
      ).toBeVisible();
    });
  });
});
