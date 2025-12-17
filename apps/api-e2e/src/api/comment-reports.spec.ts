/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  client as prismaClient,
  Comment,
  Post,
  Report,
  ReportHistory,
  ReportStatusEnum,
  User,
} from '@dans-coding-world/prisma-schema';
import {
  seedUsers,
  seedPosts,
  seedComments,
  seedReports,
  seedReportHistories,
} from '@dans-coding-world/testing-setup';
import { BaseResponse } from '@dans-coding-world/api-types';
import {
  ERROR_CODES,
  PAGINATION,
  REPORT_CONSTRAINTS,
  SUCCESS_MESSAGES,
  VALIDATION_MESSAGES,
} from '@dans-coding-world/shared-constants';
import { setupClient } from '../helper/test-client.helper';
import { createReportsRouteHelper } from '../helper/reports-request.helper';
import { GetReportsResponseDto } from '@dans-coding-world/shared-report-dto';
import { createErrorCodeResponse } from '../helper/error-response.helper';
import { generateRandomString, randomSelect } from '@dans-coding-world/helpers';
import { ReportDetail } from '@dans-coding-world/report-data-access';
import { testInvalidIds } from '../helper/validation.helper';
import { getData, getMessage } from '../helper/common.helper';

describe('/api/v1/reports/comments', () => {
  let users: User[] = [];
  let posts: Post[] = [];
  let comments: Comment[] = [];
  let reports: Report[] = [];
  let reportsHistories: ReportHistory[] = [];

  let admin: User;
  let mod: User;
  let author: User;
  let user: User;

  type ReportHelpers = ReturnType<typeof createReportsRouteHelper>;

  let adminHelpers: ReportHelpers;
  let userHelpers: ReportHelpers;
  let authorHelpers: ReportHelpers;
  let modHelpers: ReportHelpers;
  let anonHelpers: ReportHelpers; // For unauthenticated requests

  beforeAll(async () => {
    users = await seedUsers();
    posts = await seedPosts();
    comments = await seedComments();

    admin = users.find((u) => u.role === 'ADMIN') as User;
    author = users.find((u) => u.role === 'AUTHOR') as User;
    user = users.find((u) => u.role === 'USER') as User;
    mod = users.find((u) => u.role === 'MOD') as User;

    if (!admin || !author || !user || !mod) throw new Error('Missing users');

    const reportsToCreate: Omit<Report, 'id'>[] = [];

    const postsForTest = posts.filter(
      (post) => post.status === 'PUBLISHED' || post.status === 'DRAFT'
    );

    const commentsForTest = comments.filter((comment) =>
      postsForTest.map((p) => p.id).includes(comment.postId)
    );

    let i = 0;
    for (const comment of commentsForTest) {
      // Select a user that IS NOT the comment's author
      const validReporters = users.filter((u) => u.id !== comment.userId);

      const randomReporter: User = randomSelect(validReporters);

      const randomStatus = randomSelect(Object.values(ReportStatusEnum));

      reportsToCreate.push({
        reason: `Report ${i++}: ${randomStatus}`,
        status: randomStatus,
        commentId: comment.id,
        reporterId: randomReporter.id,
        createdAt: new Date(
          Date.now() + Math.floor(Math.random() * 100) * 1000 * 60 // between 1-100 min difference
        ),
      });
    }

    // Filter duplicates before inserting
    const uniqueReportsMap = new Map();
    reportsToCreate.forEach((r) => {
      const key = `${r.reporterId}-${r.commentId}`;
      if (!uniqueReportsMap.has(key)) {
        uniqueReportsMap.set(key, r);
      }
    });

    const finalReports = Array.from(uniqueReportsMap.values());

    reports = await seedReports(finalReports);

    const reportHistoriesToCreate: Omit<ReportHistory, 'id'>[] = [];

    for (const report of reports) {
      const comment = comments.find((c) => report.commentId === c.id);
      if (!comment) throw new Error('missing comment');

      const validModerators = users.filter(
        (u) => u.id !== comment.userId && u.role !== 'USER'
      );

      const randomModerator: User = randomSelect(validModerators);

      const randomStatus = randomSelect(
        Object.values(ReportStatusEnum).filter((s) => s !== report.status)
      );

      reportHistoriesToCreate.push({
        note: `Mod note ${i++}: ${report.status} => ${randomStatus} (${
          randomModerator.username
        })`,
        newStatus: randomStatus,
        previousStatus: report.status,
        reportId: report.id,
        moderatorId: randomModerator.id,
        changedAt: new Date(
          Date.now() + Math.floor(Math.random() * 100) * 1000 * 60 // between 1-100 min difference
        ),
      });
    }

    reportsHistories = await seedReportHistories(reportHistoriesToCreate);

    [adminHelpers, userHelpers, authorHelpers, modHelpers, anonHelpers] =
      await Promise.all([
        setupClient(createReportsRouteHelper, admin),
        setupClient(createReportsRouteHelper, user),
        setupClient(createReportsRouteHelper, author),
        setupClient(createReportsRouteHelper, mod),
        setupClient(createReportsRouteHelper, undefined),
      ]);
  });

  describe('GET /api/v1/reports/comments/:id', () => {
    test.each(['ADMIN', 'MOD'])(
      `should return report with the reported comment,
      malicious user and report history IF %s is logged in`,
      async (role) => {
        const helper = role === 'ADMIN' ? adminHelpers : modHelpers;

        const reportWithHistory = reports.find((report) =>
          reportsHistories.map((h) => h.reportId).includes(report.id)
        );
        if (!reportWithHistory) throw new Error('Missing report with history');

        const reportedComment = comments.find(
          (comment) => comment.id === reportWithHistory.commentId
        );
        if (!reportedComment) throw new Error('Missing test comment');

        const res = await helper.getReport(reportWithHistory.id.toString());

        expect(getMessage(res)).toBe(SUCCESS_MESSAGES.REPORTS.get);

        const report = getData<ReportDetail>(res, 'report');

        expect(report.id).toBe(reportWithHistory.id);
        expect(report.reportedBy.id).toBe(reportWithHistory.reporterId);

        expect(report.reportedComment.id).toBe(reportedComment.id);
        expect(report.reportedComment.userId).toBe(reportedComment.userId);

        expect(report.history.length).toBeGreaterThan(0);
      }
    );

    it('should return 401 UNAUTHORIZED when not logged-in', async () => {
      await expect(anonHelpers.getReport('1')).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.AUTH.UNAUTHORIZED)
      );
    });

    test.each(['USER', 'AUTHOR'])(
      'should return 403 FORBIDDEN when user role is %s',
      async (role) => {
        const helper = role === 'USER' ? userHelpers : authorHelpers;
        await expect(helper.getReport('1')).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.SERVER.FORBIDDEN)
        );
      }
    );

    testInvalidIds(async (id) => {
      return adminHelpers.getReport(id);
    }, 'report id');

    it('should return 404 NOT FOUND for unknown report id', async () => {
      return await expect(adminHelpers.getReport('9999')).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.NOT_FOUND)
      );
    });
  });

  describe('GET /api/v1/reports/comments', () => {
    test.each(['ADMIN', 'MOD'])(
      `should return reports with the reported comment IF %s is logged in`,
      async (role) => {
        const helper = role === 'ADMIN' ? adminHelpers : modHelpers;

        const res = await helper.getReports();

        expect(getMessage(res)).toBe(SUCCESS_MESSAGES.REPORTS.getAll);

        const { items } = getData<GetReportsResponseDto>(res);

        for (const report of items) {
          const expectedComment = comments.find(
            (c) => report.commentId === c.id
          );
          if (!expectedComment) throw new Error('Missing comment');

          expect(report.reportedComment.id).toBe(expectedComment.id);
          expect(report.reportedComment.content).toBe(expectedComment.content);
        }
      }
    );

    test.concurrent.each(['USER', 'AUTHOR'])(
      'should return 403 FORBIDDEN when user role is %s',
      async (role) => {
        const helper = role === 'USER' ? userHelpers : authorHelpers;

        await expect(helper.getReports()).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.SERVER.FORBIDDEN)
        );
      }
    );

    it('should return 401 UNAUTHORIZED when not logged-in', async () => {
      await expect(anonHelpers.getReports()).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.AUTH.UNAUTHORIZED)
      );
    });

    it('should retrieve only PENDING reports if no filters specified', async () => {
      const res = await modHelpers.getReports();

      const { items, pagination } = getData<GetReportsResponseDto>(res);

      expect(pagination.total).toBe(
        reports.filter((r) => r.status === 'PENDING').length
      );

      for (const report of items) expect(report.status).toBe('PENDING');
    });

    it('should provide reports for a specific post when filterBy[postId] is specified', async () => {
      const idsOfPostsContainingReportedComments = [
        ...new Set(
          posts
            .filter((p) =>
              comments.find(
                (c) =>
                  c.postId === p.id &&
                  reports.map((r) => r.commentId).includes(c.id)
              )
            )
            .map((p) => p.id)
        ),
      ];

      if (
        !idsOfPostsContainingReportedComments ||
        idsOfPostsContainingReportedComments.length === 0
      )
        throw new Error('Missing reports');

      for (const postId of idsOfPostsContainingReportedComments) {
        const res = await modHelpers.getReports({
          filterBy: {
            postId,
          },
        });

        const { items, pagination } = getData<GetReportsResponseDto>(res);

        expect(items.length).toBeGreaterThan(0);
        expect(pagination.total).toBe(
          reports.filter((r) =>
            comments.find((c) => c.postId === postId && c.id === r.commentId)
          ).length
        );
      }
    });

    it(`should provide reports made about a certain malicious actor
       when filterBy[maliciousUserId] is specified`, async () => {
      const idsOfReportedMaliciousUsers = [
        ...new Set(
          comments
            .filter((c) => reports.find((r) => r.commentId === c.id))
            .map((c) => c.userId)
        ),
      ];

      if (
        !idsOfReportedMaliciousUsers ||
        idsOfReportedMaliciousUsers.length === 0
      )
        throw new Error('Missing users');

      for (const maliciousUserId of idsOfReportedMaliciousUsers) {
        const res = await modHelpers.getReports({
          filterBy: {
            maliciousUserId,
          },
        });

        const { items, pagination } = getData<GetReportsResponseDto>(res);

        expect(items.length).toBeGreaterThan(0);
        expect(pagination.total).toBe(
          reports.filter((r) =>
            comments.find(
              (c) => c.userId === maliciousUserId && c.id === r.commentId
            )
          ).length
        );
      }
    });

    test.concurrent.each(['ANALYZING', 'POWER_TRIPPING', ''])(
      'should throw when filtering by unknown report status',
      async (status) => {
        return await expect(
          adminHelpers.getReports({
            filterBy: {
              status: [status as any],
            },
          })
        ).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.VALIDATION.VALIDATION_ERROR)
        );
      }
    );

    describe('?sortBy[x]=y', () => {
      test.concurrent.each([
        ['option does not exist', 'modifiedAt', 'asc'],
        ['option exists, but wrong value', 'createdAt', 'descending'],
        ['option exists, but value is empty', 'createdAt', ''],
        ['option exists, but value is wrong case', 'createdAt', 'DESC'],
      ])(
        'should return validation error when sortBy %s',
        async (_, key, value) => {
          return await expect(
            adminHelpers.getReports({
              sortBy: {
                [key]: value,
              },
            })
          ).rejects.toMatchObject(
            createErrorCodeResponse(ERROR_CODES.VALIDATION.VALIDATION_ERROR)
          );
        }
      );

      test.concurrent.each([
        ['created date (DESC)', 'createdAt', true],
        ['created date (ASC)', 'createdAt', false],
      ])(
        'should sort items provided that sorting by %s is applied',
        async (_, propName, isDescending: boolean) => {
          const res = await adminHelpers.getReports({
            sortBy: {
              [propName]: isDescending ? 'desc' : 'asc',
            },
          });

          const reportsData = getData<GetReportsResponseDto>(res);

          const sortedItems = [...reportsData.items].sort((prev, next) => {
            if (!prev[propName] || !next[propName]) return 0;
            const prevDate = new Date(prev[propName]).getTime();
            const nextDate = new Date(next[propName]).getTime();
            return isDescending ? nextDate - prevDate : prevDate - nextDate;
          });

          sortedItems.forEach((report, i) => {
            expect(report.id).toBe(reportsData.items[i].id);
          });
        }
      );
    });

    describe('?pageOffset=x&pageSize=y', () => {
      const pageSizeOptions = PAGINATION.REPORTS.ITEMS_PER_PAGE_OPTIONS;
      const defaultPageSize = PAGINATION.REPORTS.DEFAULT_ITEMS_PER_PAGE;
      let totalNumberOfReports: number;

      beforeAll(() => {
        totalNumberOfReports = reports.length;
      });

      it(`should return the default items per page (${defaultPageSize})
       when pageSize is not defined`, async () => {
        const offset = 10;
        const res = await adminHelpers.getReports({
          pageOffset: offset,
          filterBy: {
            status: ['PENDING', 'RESOLVED', 'DISMISSED', 'REVIEWING'],
          },
        });

        const postsData = getData<GetReportsResponseDto>(res);

        expect(postsData.count).toBe(defaultPageSize);
        expect(postsData.items.length).toBe(defaultPageSize);
        expect(postsData.pagination.page).toBe(offset / defaultPageSize + 1);
      });

      it('should return 0 items when offset is beyond total number of reports', async () => {
        const totalRoundUpToHundred = Math.ceil(reports.length / 100) * 100;

        const res = await adminHelpers.getReports({
          pageOffset: totalRoundUpToHundred,
          pageSize: pageSizeOptions[2],
        });

        const reportsData = getData<GetReportsResponseDto>(res);

        expect(reportsData.pagination.page).toBe(
          Math.ceil(totalRoundUpToHundred / pageSizeOptions[2]) + 1
        );
        expect(reportsData.count).toBe(0);
        expect(reportsData.items.length).toBe(0);
      });

      test.concurrent.each([
        [1, 0, pageSizeOptions[0]],
        [2, pageSizeOptions[0], pageSizeOptions[0]],
        [3, pageSizeOptions[0] * 2, pageSizeOptions[0]],
        [2, pageSizeOptions[1], pageSizeOptions[1]],
        [5, pageSizeOptions[1] * 4, pageSizeOptions[1]],
      ])(
        'should return page #%s when [ offset: %s ; pageLimit %s ]',
        async (expectedPageNum, pageOffset, pageSize) => {
          const res = await adminHelpers.getReports({
            pageOffset,
            pageSize,
            filterBy: {
              status: ['PENDING', 'RESOLVED', 'DISMISSED', 'REVIEWING'],
            },
          });

          const reportsData = getData<GetReportsResponseDto>(res);

          expect(reportsData.pagination.page).toBe(expectedPageNum);
          expect(reportsData.pagination.total).toBe(totalNumberOfReports);
        }
      );

      test.concurrent.each([
        [
          'selected page size is not in the allowed options',
          {
            pageSize: 999,
            pageOffset: 0,
          },
        ],
        [
          'offset is not divisible by page size',
          {
            pageSize: pageSizeOptions[0],
            pageOffset: 23,
          },
        ],
        [
          'offset is not a number',
          {
            pageOffset: 'abc',
          },
        ],
        [
          'page size is not a number',
          {
            pageSize: 'abc',
          },
        ],
        [
          'offset is decimal',
          {
            pageOffset: 1.5,
          },
        ],
        [
          'page size is decimal',
          {
            pageSize: 5.5,
          },
        ],
        [
          'postId is decimal',
          {
            filterBy: {
              postId: 1.5,
            },
          },
        ],
        [
          'postId is letter',
          {
            filterBy: {
              postId: 'a',
            },
          },
        ],
        [
          'maliciousUserId is decimal',
          {
            filterBy: {
              maliciousUserId: 1.5,
            },
          },
        ],
        [
          'maliciousUserId is letter',
          {
            filterBy: {
              maliciousUserId: 'a',
            },
          },
        ],
      ])('should return validation error when %s', async (_, params) => {
        await expect(adminHelpers.getReports(params)).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.VALIDATION.VALIDATION_ERROR)
        );
      });
    });
  });

  describe('POST /api/v1/reports/comments', () => {
    let testPosts: Post[];
    let testComments: Comment[];
    const testReports: Report[] = [];

    beforeAll(async () => {
      const postsForCreation: Post[] = [
        {
          id: 200,
          content: 'RANDOM CONTENT',
          title: 'RANDOM TITLE',
          status: 'PUBLISHED',
          visibility: 'PUBLIC',
          authorId: author.id,
          createdAt: new Date(),
          updatedAt: new Date(),
          publishedAt: null,
        },
        {
          id: 201,
          content: 'RANDOM CONTENT',
          title: 'RANDOM TITLE',
          status: 'DRAFT',
          visibility: 'PUBLIC',
          authorId: author.id,
          createdAt: new Date(),
          updatedAt: new Date(),
          publishedAt: null,
        },
      ];

      testPosts = await seedPosts(postsForCreation, {
        clearExisting: false,
        useDefaults: false,
      });

      const commentsToCreate: any[] = [];

      for (const post of testPosts) {
        const numOfCommentsNeededForEachUser = users.length;

        for (let i = 0; i < numOfCommentsNeededForEachUser; i++) {
          const commenter = users[i];

          const comment = {
            content: `Comment ${i} on post ${post.id}`,
            postId: post.id,
            userId: commenter.id,
            depth: 0,
            threadParentId: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          commentsToCreate.push(comment);
        }
      }

      testComments = await seedComments(commentsToCreate, {
        clearExisting: false,
        useDefaults: false,
      });
    });

    afterAll(async () => {
      // cascade delete everything referenced
      await prismaClient.post.deleteMany({
        where: {
          id: {
            in: testPosts.map((p) => p.id),
          },
        },
      });
    });

    it('should create a PENDING report with createdAt being the current datetime', async () => {
      const now = new Date();
      const reportReason = generateRandomString(10);

      const commentToReport = testComments.find(
        (c) =>
          !testReports.map((r) => r.commentId).includes(c.id) &&
          c.userId !== mod.id
      );

      if (!commentToReport) throw new Error('Missing test comment');

      const res = await modHelpers.createReport({
        commentId: commentToReport.id,
        reason: reportReason,
      });

      const createdReport = getData<Report>(res, 'report');
      expect(createdReport).toBeDefined();

      expect(createdReport.reason).toBe(reportReason);
      expect(createdReport.status).toBe('PENDING');
      // Check date and time down to minutes
      expect(new Date(createdReport.createdAt).toISOString().slice(0, 16)).toBe(
        now.toISOString().slice(0, 16)
      );

      testReports.push(createdReport);
    });

    it('should not allow the user to make another report on the same comment', async () => {
      const commentToReport = testComments.find(
        (c) =>
          !testReports.map((r) => r.commentId).includes(c.id) &&
          c.userId !== user.id &&
          testPosts
            .filter((p) => p.status === 'PUBLISHED')
            .map((p) => p.id)
            .includes(c.postId)
      );

      if (!commentToReport) throw new Error('Missing test comment');

      const res = await userHelpers.createReport({
        commentId: commentToReport.id,
        reason: generateRandomString(10),
      });

      const { data } = res.data as BaseResponse;

      const createdReport = (data as any).report as Report;
      testReports.push(createdReport);

      await expect(
        userHelpers.createReport({
          commentId: commentToReport.id,
          reason: generateRandomString(10),
        })
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.VALIDATION.REPORT_EXISTS)
      );
    });

    it(`should return 403 FORBIDDEN when the same user
      that made the comment - is trying to report it`, async () => {
      const commentReportedByUser = testComments.find(
        (c) =>
          c.userId === user.id &&
          !testReports.map((r) => r.commentId).includes(c.id)
      );
      if (!commentReportedByUser) throw new Error('Missing test comment');

      await expect(
        userHelpers.createReport({
          commentId: commentReportedByUser.id,
          reason: generateRandomString(10),
        })
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.FORBIDDEN)
      );
    });

    it('should return 401 UNAUTHORIZED when not logged-in', async () => {
      if (!comments[0]) throw new Error('Missing initial comment data');
      await expect(
        anonHelpers.createReport({
          commentId: comments[0].id,
          reason: generateRandomString(10),
        })
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.AUTH.UNAUTHORIZED)
      );
    });

    it('should return 404 NOT_FOUND when comment does not exist', async () => {
      await expect(
        modHelpers.createReport({
          commentId: 9999,
          reason: generateRandomString(10),
        })
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.NOT_FOUND)
      );
    });

    it(`should return 403 FORBIDDEN when the comment's post's status is 
    not PUBLISHED and the logged-in user is not ADMIN, MOD or the AUTHOR`, async () => {
      const commentNotMadeOrReportedByUserOnAPrivatePost = testComments.find(
        (c) =>
          c.userId !== user.id &&
          !testReports.map((r) => r.commentId).includes(c.id) &&
          testPosts.find((p) => p.status !== 'PUBLISHED')?.id === c.postId
      );
      if (!commentNotMadeOrReportedByUserOnAPrivatePost)
        throw new Error('Missing test comment');

      await expect(
        userHelpers.createReport({
          commentId: commentNotMadeOrReportedByUserOnAPrivatePost.id,
          reason: generateRandomString(10),
        })
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.FORBIDDEN)
      );
    });

    test.each([
      ['user is ADMIN', 'ADMIN'],
      ['user is MOD', 'MOD'],
      ['user is the author of the private post', 'AUTHOR'],
    ])(
      'should allow to create reports on private posts when %s',
      async (_, role) => {
        const usersByRole: Record<string, any> = {
          MOD: mod,
          USER: user,
          AUTHOR: author,
          ADMIN: admin,
        };
        const reporter = usersByRole[role];
        if (!reporter) throw new Error('Missing test user');

        // Use dynamic helper based on reporter role
        const helper =
          role === 'ADMIN'
            ? adminHelpers
            : role === 'MOD'
            ? modHelpers
            : authorHelpers;

        const commentOnAPrivatePostWithoutReports = testComments.find(
          (c) =>
            !testReports.map((r) => r.commentId).includes(c.id) &&
            testPosts.find((p) => p.status !== 'PUBLISHED')?.id === c.postId &&
            c.userId !== reporter.id
        );
        if (!commentOnAPrivatePostWithoutReports)
          throw new Error('Missing test comment');

        const res = await helper.createReport({
          commentId: commentOnAPrivatePostWithoutReports.id,
          reason: generateRandomString(10),
        });

        const { data } = res.data as BaseResponse;

        const report = (data as any).report as Report;
        expect(report).toBeDefined();
        expect(report.reporterId).toBe(reporter.id);

        testReports.push(report);
      }
    );

    test.each([
      [
        'is too long',
        generateRandomString(REPORT_CONSTRAINTS.MAX_REASON_LENGTH + 1),
      ],
    ])(
      'should throw validation error when report reason field %s',
      async (_, reason) => {
        if (!testComments[0]) throw new Error('Missing initial comment data');
        await expect(
          adminHelpers.createReport({
            commentId: testComments[0].id,
            reason,
          })
        ).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.VALIDATION.VALIDATION_ERROR)
        );
      }
    );

    test.concurrent.each([
      ['is undefined', undefined],
      ['is empty string', ''],
    ])(
      'should throw validation error when commentId %s',
      async (_, commentId) => {
        await expect(
          adminHelpers.createReport({
            commentId: commentId as any,
            reason: generateRandomString(10),
          })
        ).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.VALIDATION.VALIDATION_ERROR)
        );
      }
    );
  });

  describe('PATCH /api/v1/reports/comments/:id', () => {
    it(`should return new updated entry with its
    change included in moderation history`, async () => {
      const MOD_NOTE = 'checking report out';

      const reportForUpdate = reports.find((r) =>
        comments
          .filter((c) => c.userId !== mod.id)
          .map((c) => c.id)
          .includes(r.commentId)
      );
      if (!reportForUpdate) throw new Error('Missing test report');

      const newStatus = randomSelect(
        Object.values(ReportStatusEnum).filter(
          (s) => s !== reportForUpdate.status
        )
      );

      const now = new Date();

      const res = await modHelpers.updateReport(reportForUpdate.id.toString(), {
        status: newStatus,
        note: MOD_NOTE,
      });

      const report = getData<ReportDetail>(res, 'report');
      expect(report).toBeDefined();

      // Report should contain: History by far + new entry
      expect(report.history.length).toBe(
        reportsHistories.filter((rh) => rh.reportId === reportForUpdate.id)
          .length + 1
      );

      const latestModerationHistoryEntry =
        report.history[report.history.length - 1];

      expect(latestModerationHistoryEntry.moderatorId).toBe(mod.id);
      expect(latestModerationHistoryEntry.newStatus).toBe(newStatus);
      expect(latestModerationHistoryEntry.note).toBe(MOD_NOTE);
      expect(
        new Date(latestModerationHistoryEntry.changedAt)
          .toISOString()
          .slice(0, 16)
      ).toBe(now.toISOString().slice(0, 16));
    });

    it('should throw error when updating report to the same status', async () => {
      const reportForUpdate = reports.find((r) =>
        comments
          .filter((c) => c.userId !== admin.id)
          .map((c) => c.id)
          .includes(r.commentId)
      );
      if (!reportForUpdate) throw new Error('Missing test report');

      await expect(
        adminHelpers.updateReport(reportForUpdate.id.toString(), {
          status: reportForUpdate.status,
          note: generateRandomString(10),
        })
      ).rejects.toMatchObject(
        createErrorCodeResponse(
          ERROR_CODES.VALIDATION.VALIDATION_ERROR,
          VALIDATION_MESSAGES.reports.sameStatus
        )
      );
    });

    it('should throw error when moderatorId matches the user who got reported', async () => {
      const reportForUpdate = reports.find((r) =>
        comments
          .filter((c) => c.userId === mod.id)
          .map((c) => c.id)
          .includes(r.commentId)
      );
      if (!reportForUpdate) throw new Error('Missing test report');

      await expect(
        modHelpers.updateReport(reportForUpdate.id.toString(), {
          status: randomSelect(
            Object.values(ReportStatusEnum).filter(
              (s) => s !== reportForUpdate.status
            )
          ),
          note: generateRandomString(10),
        })
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.FORBIDDEN)
      );
    });

    test.concurrent.each(['ANALYZING', 'POWER_TRIPPING'])(
      'should throw when setting unknown status',
      async (status) => {
        if (!reports[0]) throw new Error('Missing initial report data');
        await expect(
          modHelpers.updateReport(reports[0].id.toString(), {
            status: status as any,
            note: generateRandomString(10),
          })
        ).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.VALIDATION.VALIDATION_ERROR)
        );
      }
    );

    test.concurrent.each(['USER', 'AUTHOR'])(
      'should return 403 FORBIDDEN when user role is %s',
      async (role) => {
        const userToTest = users.find((u) => u.role === role);
        if (!userToTest) throw new Error('Missing test user');
        if (!reports[0]) throw new Error('Missing initial report data');

        const helper = role === 'USER' ? userHelpers : authorHelpers;

        await expect(
          helper.updateReport(reports[0].id.toString(), {
            status: 'DISMISSED',
          })
        ).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.SERVER.FORBIDDEN)
        );
      }
    );

    it('should return 401 UNAUTHORIZED when not logged-in', async () => {
      if (!reports[0]) throw new Error('Missing initial report data');
      await expect(
        anonHelpers.updateReport(reports[0].id.toString(), {
          status: 'DISMISSED',
        })
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.AUTH.UNAUTHORIZED)
      );
    });

    it('should throw when report with that id does not exist', async () => {
      await expect(
        modHelpers.updateReport('9999', {
          status: 'PENDING',
          note: generateRandomString(10),
        })
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.NOT_FOUND)
      );
    });

    test.each([
      [
        'is too long',
        generateRandomString(REPORT_CONSTRAINTS.MAX_REASON_LENGTH + 1),
      ],
    ])('should throw validation error when note field %s', async (_, note) => {
      if (!reports[0]) throw new Error('Missing initial report data');
      await expect(
        modHelpers.updateReport(reports[0].id.toString(), {
          status: 'PENDING',
          note,
        })
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.VALIDATION.VALIDATION_ERROR)
      );
    });

    testInvalidIds(async (id) => {
      return adminHelpers.updateReport(id, {
        status: 'PENDING',
        note: generateRandomString(10),
      });
    }, 'report id');
  });

  describe('DELETE /api/v1/reports/comments/:id', () => {
    let reportForDeletion: Report;
    let commentWithoutReport: Comment;

    beforeAll(async () => {
      [commentWithoutReport] = await seedComments(
        [
          {
            id: 2000,
            content: 'Random content',
            createdAt: new Date(),
            depth: 0,
            postId: posts[0].id,
            threadParentId: null,
            userId: user.id,
            updatedAt: new Date(),
          },
        ],
        {
          clearExisting: false,
          useDefaults: false,
        }
      );
      if (!commentWithoutReport)
        throw new Error('Missing comment for deletion test setup');

      [reportForDeletion] = await seedReports(
        [
          {
            commentId: commentWithoutReport.id,
            createdAt: new Date(),
            reason: 'Idk, hes pissing me off',
            reporterId: user.id,
            status: 'REVIEWING',
          },
        ],
        {
          clearExisting: false,
          useDefaults: false,
        }
      );
      if (!reportForDeletion)
        throw new Error('Missing report for deletion test setup');

      await seedReportHistories([
        {
          changedAt: new Date(),
          moderatorId: mod.id,
          newStatus: 'REVIEWING',
          previousStatus: 'PENDING',
          note: 'Reviewing user report',
          reportId: reportForDeletion.id,
        },
      ]);
    });

    afterAll(async () => {
      await prismaClient.comment.delete({
        where: {
          id: commentWithoutReport.id,
        },
      });
    });

    it(`should delete a report and its related report 
    history if user requesting it is ADMIN`, async () => {
      const res = await adminHelpers.deleteReport(
        reportForDeletion.id.toString()
      );

      expect(getMessage(res)).toBe(SUCCESS_MESSAGES.REPORTS.delete);

      const reportHistories = await prismaClient.reportHistory.findMany({
        where: {
          reportId: reportForDeletion.id,
        },
      });
      expect(reportHistories.length).toBe(0);

      // Deleted Comment should not exist afterwards
      await expect(
        adminHelpers.getReport(reportForDeletion.id.toString())
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.NOT_FOUND)
      );
    });

    test.each(['USER', 'AUTHOR', 'MOD'])(
      'should return 403 FORBIDDEN when user role is %s',
      async (role) => {
        const userToTest = users.find((u) => u.role === role);
        if (!userToTest) throw new Error('Missing test user');
        if (!reports[0]) throw new Error('Missing initial report data');

        const helper =
          role === 'USER'
            ? userHelpers
            : role === 'AUTHOR'
            ? authorHelpers
            : modHelpers;

        await expect(
          helper.deleteReport(reports[0].id.toString())
        ).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.SERVER.FORBIDDEN)
        );
      }
    );

    it('should return 401 UNAUTHORIZED when not logged-in', async () => {
      if (!reports[0]) throw new Error('Missing initial report data');
      await expect(
        anonHelpers.deleteReport(reports[0].id.toString())
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.AUTH.UNAUTHORIZED)
      );
    });

    it('should throw when report with that id does not exist', async () => {
      await expect(adminHelpers.deleteReport('9999')).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.NOT_FOUND)
      );
    });

    testInvalidIds(async (id) => {
      return adminHelpers.deleteReport(id);
    }, 'report id');
  });
});
