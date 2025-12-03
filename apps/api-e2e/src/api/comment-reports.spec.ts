/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Comment,
  Post,
  PostStatus,
  Report,
  ReportHistory,
  ReportStatusEnum,
  Tag,
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
  VALIDATION_MESSAGES,
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
import {
  generateRandomString,
  getKey,
  randomInteger,
  randomSelect,
} from '@dans-coding-world/helpers';
import { StatusCodes } from 'http-status-codes';
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
});
