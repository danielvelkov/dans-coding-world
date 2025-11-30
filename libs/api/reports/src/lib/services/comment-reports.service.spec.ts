/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';
import {
  COMMENT_REPORTS_REPOSITORY_TOKEN,
  USER_REPOSITORY_TOKEN,
  CommentReportsService,
} from './comment-reports.service.js';
import {
  ICommentRepository,
  IPostRepository,
  IReportRepository,
  IUserRepository,
} from '@dans-coding-world/shared-data-access-interfaces';
import {
  Comment,
  CommentWhereInput,
  CommentsOrderByInput,
  Post,
  PostOrderByInput,
  PostStatus,
  PostVisibility,
  PostWhereInput,
  Report,
  ReportHistory,
  ReportOrderByInput,
  ReportWhereInput,
  Role,
  User,
  client,
} from '@dans-coding-world/prisma-schema';
import { ReflectiveInjector } from 'injection-js';
import {
  PrismaCommentReportDataAccess as MockCommentReportRepository,
  ReportDetail,
} from '@dans-coding-world/report-data-access';
import { PrismaUserDataAccess as MockUserRepository } from '@dans-coding-world/user-data-access';
import {
  PrismaPostDataAccess as MockPostRepository,
  PrismaPostCommentsDataAccess as MockCommentRepository,
} from '@dans-coding-world/post-data-access';
import {
  ERROR_CODES,
  ERROR_MESSAGES,
  PAGINATION,
  VALIDATION_MESSAGES,
} from '@dans-coding-world/shared-constants';
import { ICommentReportsService } from '../interfaces/comment-reports-service.interface.js';

let mockUsersRepo: IUserRepository;
let mockPostsRepo: IPostRepository<Post, PostWhereInput, PostOrderByInput>;
let mockCommentsRepo: ICommentRepository<
  Comment,
  CommentWhereInput,
  CommentsOrderByInput
>;
let mockCommentReportsRepo: IReportRepository<
  Report,
  ReportWhereInput,
  ReportOrderByInput
>;

let injector: ReflectiveInjector;
let commentReportsService: ICommentReportsService;

describe('CommentReportsService', () => {
  let user: User;
  let admin: User;
  let mod: User;
  let author: User;

  let publishedPost: Post;
  let draftAuthorPost: Post;
  let membersOnlyAdminPost: Post;

  const validPostContent = {
    title: 'Very valid title',
    content: 'Very valid description',
    createdAt: new Date(),
    publishedAt: null,
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    await client.user.deleteMany();

    mockPostsRepo = new MockPostRepository();
    mockUsersRepo = new MockUserRepository();
    mockCommentsRepo = new MockCommentRepository();
    mockCommentReportsRepo = new MockCommentReportRepository();

    const roles: Role[] = ['USER', 'ADMIN', 'MOD', 'AUTHOR'];

    [user, admin, mod, author] = await Promise.all(
      roles.map((role) =>
        mockUsersRepo.create({
          email: `fake${role.toLowerCase()}123@gmail.com`,
          password: `fake${role.toLowerCase()}Pass`,
          username: `fake${role.toLowerCase()}123`,
          role,
        })
      )
    );

    const postsForCreation: {
      status: PostStatus;
      visibility: PostVisibility;
      author: User;
    }[] = [
      { author: author, visibility: 'PUBLIC', status: 'PUBLISHED' },
      { author: admin, visibility: 'MEMBERS_ONLY', status: 'PUBLISHED' },
      { author: author, visibility: 'PUBLIC', status: 'DRAFT' },
    ];

    [publishedPost, membersOnlyAdminPost, draftAuthorPost] = await Promise.all(
      postsForCreation.map((post) =>
        mockPostsRepo.create({
          ...validPostContent,
          authorId: post.author.id,
          ...post,
        })
      )
    );

    injector = ReflectiveInjector.resolveAndCreate([
      CommentReportsService,
      {
        provide: USER_REPOSITORY_TOKEN,
        useValue: mockUsersRepo,
      },
      {
        provide: COMMENT_REPORTS_REPOSITORY_TOKEN,
        useValue: mockCommentReportsRepo,
      },
    ]);
    commentReportsService = injector.get(
      CommentReportsService
    ) as CommentReportsService;

    jest.spyOn(mockCommentReportsRepo, 'create');
    jest.spyOn(mockCommentReportsRepo, 'update');
    jest.spyOn(mockCommentReportsRepo, 'delete');
  });

  describe('getById()', () => {
    let maliciousUser: User;
    let reportedComment: Comment;
    let reportByAuthor: Report;
    let historyForReport: Omit<ReportHistory, 'id'>[];

    const REPORT_REASON = 'Inappropriate';
    const REPORTED_COMMENT_CONTENT = 'I am rage-baiting';

    beforeEach(async () => {
      await mockCommentReportsRepo.deleteMany({});
      await mockCommentsRepo.deleteMany({});

      maliciousUser = user;

      reportedComment = await mockCommentsRepo.create({
        content: REPORTED_COMMENT_CONTENT,
        postId: publishedPost.id,
        userId: maliciousUser.id,
        depth: 0,
        threadParentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      reportByAuthor = await mockCommentReportsRepo.create({
        reason: REPORT_REASON,
        status: 'PENDING',
        commentId: reportedComment.id,
        createdAt: new Date(),
        reporterId: author.id,
      });

      historyForReport = [
        {
          changedAt: new Date(),
          moderatorId: mod.id,
          newStatus: 'PENDING',
          previousStatus: 'REVIEWING',
          reportId: reportByAuthor.id,
          note: 'banned',
        },
      ];

      await client.reportHistory.createMany({
        data: historyForReport,
      });
    });

    it(`should return reported comment and its author,
       user who reported it and report history`, async () => {
      const res = await commentReportsService.getById({
        reportId: reportByAuthor.id,
      });

      const report = res.report as ReportDetail;

      expect(report.id).toBe(reportByAuthor.id);
      expect(report.reason).toBe(reportByAuthor.reason);
      expect(report.status).toBe(reportByAuthor.status);

      expect(report.reportedBy.id).toBe(author.id);
      expect(report.reportedBy.email).toBe(author.email);

      expect(report.reportedComment.id).toBe(reportedComment.id);
      expect(report.reportedComment.content).toBe(reportedComment.content);

      const commentAuthor = (report.reportedComment as any).user as User;

      expect(commentAuthor.id).toBe(maliciousUser.id);
      expect(commentAuthor.email).toBe(maliciousUser.email);

      const reportHistoryChange = report.history[0];
      expect(reportHistoryChange.note).toBe(historyForReport[0].note);
      expect(reportHistoryChange.moderatorId).toBe(
        historyForReport[0].moderatorId
      );
    });

    test.each([
      ['is null', null],
      ['is undefined', undefined],
      ['is empty', ''],
    ])(
      'should throw validation error when reportId param %s',
      async (_, id) => {
        expect.assertions(1);
        return commentReportsService
          .getById({ reportId: id as any })
          .catch((error) => {
            expect(error.message).toMatch(
              ERROR_MESSAGES[ERROR_CODES.VALIDATION.VALIDATION_ERROR]
            );
          });
      }
    );

    it('should throw when report with that id does not exist', async () => {
      expect.assertions(1);
      return commentReportsService
        .getById({
          reportId: 9999,
        })
        .catch((error) => {
          expect(error.message).toMatch(
            ERROR_MESSAGES[ERROR_CODES.SERVER.NOT_FOUND]
          );
        });
    });
  });
});
