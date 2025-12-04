/* eslint-disable @typescript-eslint/no-explicit-any */
import {
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
  SUCCESS_MESSAGES,
} from '@dans-coding-world/shared-constants';
import { createAuthRouteHelper } from '../helper/auth-request.helper';
import { createAxiosClient } from '../helper/test-client.helper';
import { createReportsRouteHelper } from '../helper/reports-request.helper';
import {
  CreateReportDto,
  GetReportsResponseDto,
  UpdateReportDto,
} from '@dans-coding-world/shared-report-dto';
import { AxiosInstance, AxiosResponse } from 'axios';
import { createErrorCodeResponse } from '../helper/error-response.helper';
import { randomSelect } from '@dans-coding-world/helpers';
import { ReportDetail } from '@dans-coding-world/report-data-access';

describe('/api/v1/reports/comments', () => {
  let client: AxiosInstance;
  let login: (
    email: string,
    password: string
  ) => Promise<AxiosResponse<BaseResponse>>;
  let getReports: (params?: any) => Promise<AxiosResponse<unknown>>;
  let getReport: (id: any) => Promise<AxiosResponse<unknown>>;
  let createReport: (
    data: Omit<CreateReportDto, 'authorId'>
  ) => Promise<AxiosResponse<unknown>>;
  let updateReport: (
    id: string,
    data: Omit<UpdateReportDto, 'userId' | 'postId'>
  ) => Promise<AxiosResponse<unknown>>;
  let deleteReport: (id: string) => Promise<AxiosResponse<unknown>>;

  let users: User[] = [];
  let posts: Post[] = [];
  let comments: Comment[] = [];
  let reports: Report[] = [];
  let reportsHistories: ReportHistory[] = [];

  let admin: User;
  let mod: User;
  let author: User;
  let user: User;

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
      (post) =>
        post.status === 'PUBLISHED' ||
        (post.status === 'DRAFT' && post.visibility === 'PUBLIC')
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
  });

  beforeEach(() => {
    client = createAxiosClient();
    ({ login } = createAuthRouteHelper(client));
    ({ getReports, getReport, createReport, updateReport, deleteReport } =
      createReportsRouteHelper(client));
  });

  describe('GET /api/v1/reports/comments/:id', () => {
    test.each(['ADMIN', 'MOD'])(
      `should return comment report with the reported comment,
      malicious user and report history IF %s is logged in`,
      async (role) => {
        const viewer = users.find((u) => u.role === role);
        if (!viewer) throw new Error('Missing test user');

        await login(viewer.email, viewer.password);

        const reportWithHistory = reports.find((report) =>
          reportsHistories.map((h) => h.reportId).includes(report.id)
        );
        if (!reportWithHistory) throw new Error('Missing report with history');

        const reportedComment = comments.find(
          (comment) => comment.id === reportWithHistory.commentId
        );
        if (!reportedComment) throw new Error('Missing test comment');

        const res = await getReport(reportWithHistory.id.toString());
        const { data } = res.data as BaseResponse;

        expect(data).toHaveProperty('message', SUCCESS_MESSAGES.REPORTS.get);

        const report = (data as any).report as ReportDetail;

        expect(report.id).toBe(reportWithHistory.id);
        expect(report.reportedBy.id).toBe(reportWithHistory.reporterId);

        expect(report.reportedComment.id).toBe(reportedComment.id);
        expect(report.reportedComment.userId).toBe(reportedComment.userId);

        expect(report.history.length).toBeGreaterThan(0);
      }
    );

    it('should return 401 UNAUTHORIZED when not logged-in', async () => {
      await expect(getReport(1)).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.AUTH.UNAUTHORIZED)
      );
    });

    test.each(['USER', 'AUTHOR'])(
      'should return 403 FORBIDDEN when user role is %s',
      async (role) => {
        const user = users.find((u) => u.role === role);
        if (!user) throw new Error('Missing test user');

        await login(user.email, user.password);
        await expect(getReport(1)).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.SERVER.FORBIDDEN)
        );
      }
    );
    test.each([
      ['is letter', 'a'],
      ['is special character', '@'],
      ['is decimal number', '12.34'],
      ['is negative number', '-5'],
      ['is boolean true', 'true'],
      ['is boolean false', 'false'],
      ['is null string', 'null'],
      ['is undefined string', 'undefined'],
    ])('should return validation error when report id %s', async (_, id) => {
      await login(admin.email, admin.password);
      await expect(getReport(id as any)).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.VALIDATION.VALIDATION_ERROR)
      );
    });

    it('should return 404 NOT FOUND for unknown report id', async () => {
      await login(admin.email, admin.password);
      return await expect(getReport(999)).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.NOT_FOUND)
      );
    });
  });

  describe('GET /api/v1/reports/comments', () => {
    test.each(['ADMIN', 'MOD'])(
      `should return reports with the reported comment IF %s is logged in`,
      async (role) => {
        const viewer = users.find((u) => u.role === role);
        if (!viewer) throw new Error('Missing test user');

        await login(viewer.email, viewer.password);

        const res = await getReports();
        const { data } = res.data as BaseResponse;

        expect(data).toHaveProperty('message', SUCCESS_MESSAGES.REPORTS.getAll);

        const { items } = data as GetReportsResponseDto;

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
    test.each(['USER', 'AUTHOR'])(
      'should return 403 FORBIDDEN when user role is %s',
      async (role) => {
        const user = users.find((u) => u.role === role);
        if (!user) throw new Error('Missing test user');

        await login(user.email, user.password);
        await expect(getReports()).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.SERVER.FORBIDDEN)
        );
      }
    );

    it('should return 401 UNAUTHORIZED when not logged-in', async () => {
      await expect(getReports()).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.AUTH.UNAUTHORIZED)
      );
    });

    it('should retrieve only PENDING reports if no filters specified', async () => {
      await login(mod.email, mod.password);
      const res = await getReports();
      const { data } = res.data as BaseResponse;

      const { items, pagination } = data as GetReportsResponseDto;

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
        await login(mod.email, mod.password);
        const res = await getReports({
          filterBy: {
            postId,
          },
        });
        const { data } = res.data as BaseResponse;

        const { items, pagination } = data as GetReportsResponseDto;

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
        await login(mod.email, mod.password);
        const res = await getReports({
          filterBy: {
            maliciousUserId,
          },
        });
        const { data } = res.data as BaseResponse;

        const { items, pagination } = data as GetReportsResponseDto;

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

    test.each(['ANALYZING', 'POWER_TRIPPING', ''])(
      'should throw when filtering by unknown report status',
      async (status) => {
        await login(admin.email, admin.password);
        return await expect(
          getReports({
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
      test.each([
        ['option does not exist', 'modifiedAt', 'asc'],
        ['option exists, but wrong value', 'createdAt', 'descending'],
        ['option exists, but value is empty', 'createdAt', ''],
        ['option exists, but value is wrong case', 'createdAt', 'DESC'],
      ])(
        'should return validation error when sortBy %s',
        async (_, key, value) => {
          await login(admin.email, admin.password);
          return await expect(
            getReports({
              sortBy: {
                [key]: value,
              },
            })
          ).rejects.toMatchObject(
            createErrorCodeResponse(ERROR_CODES.VALIDATION.VALIDATION_ERROR)
          );
        }
      );

      test.each([
        ['created date (DESC)', 'createdAt', true],
        ['created date (ASC)', 'createdAt', false],
      ])(
        'should sort items provided that sorting by %s is applied',
        async (_, propName, isDescending: boolean) => {
          await login(admin.email, admin.password);
          const res = await getReports({
            sortBy: {
              [propName]: isDescending ? 'desc' : 'asc',
            },
          });

          const { data } = res.data as BaseResponse;
          const reportsData = data as GetReportsResponseDto;

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
        await login(admin.email, admin.password);
        const offset = 10;
        const res = await getReports({
          pageOffset: offset,
          filterBy: {
            status: ['PENDING', 'RESOLVED', 'DISMISSED', 'REVIEWING'],
          },
        });
        const { data } = res.data as BaseResponse;
        const postsData = data as GetReportsResponseDto;

        expect(postsData.count).toBe(defaultPageSize);
        expect(postsData.items.length).toBe(defaultPageSize);
        expect(postsData.pagination.page).toBe(offset / defaultPageSize + 1);
      });

      it('should return 0 items when offset is beyond total number of reports', async () => {
        const totalRoundUpToHundred = Math.ceil(reports.length / 100) * 100;
        await login(admin.email, admin.password);
        const res = await getReports({
          pageOffset: totalRoundUpToHundred,
          pageSize: pageSizeOptions[2],
        });
        const { data } = res.data as BaseResponse;
        const reportsData = data as GetReportsResponseDto;

        expect(reportsData.pagination.page).toBe(
          Math.ceil(totalRoundUpToHundred / pageSizeOptions[2]) + 1
        );
        expect(reportsData.count).toBe(0);
        expect(reportsData.items.length).toBe(0);
      });

      test.each([
        [1, 0, pageSizeOptions[0]],
        [2, pageSizeOptions[0], pageSizeOptions[0]],
        [3, pageSizeOptions[0] * 2, pageSizeOptions[0]],
        [2, pageSizeOptions[1], pageSizeOptions[1]],
        [5, pageSizeOptions[1] * 4, pageSizeOptions[1]],
      ])(
        'should return page #%s when [ offset: %s ; pageLimit %s ]',
        async (expectedPageNum, pageOffset, pageSize) => {
          await login(admin.email, admin.password);
          const res = await getReports({
            pageOffset,
            pageSize,
            filterBy: {
              status: ['PENDING', 'RESOLVED', 'DISMISSED', 'REVIEWING'],
            },
          });
          const { data } = res.data as BaseResponse;
          const reportsData = data as GetReportsResponseDto;

          expect(reportsData.pagination.page).toBe(expectedPageNum);
          expect(reportsData.pagination.total).toBe(totalNumberOfReports);
        }
      );

      test.each([
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
        await login(admin.email, admin.password);
        await expect(getReports(params)).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.VALIDATION.VALIDATION_ERROR)
        );
      });
    });
  });
});
