/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';
import {
  COMMENT_REPORTS_REPOSITORY_TOKEN,
  USER_REPOSITORY_TOKEN,
  CommentReportsService,
  POST_REPOSITORY_TOKEN,
  COMMENT_REPOSITORY_TOKEN,
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
  REPORT_CONSTRAINTS,
  VALIDATION_MESSAGES,
} from '@dans-coding-world/shared-constants';
import { ICommentReportsService } from '../interfaces/comment-reports-service.interface.js';
import { generateRandomString } from '@dans-coding-world/helpers';

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

  let maliciousUser: User;
  let reportedComment: Comment;
  let reportByAuthor: Report;
  let historyForReport: Omit<ReportHistory, 'id'>[];

  const REPORT_REASON = 'Inappropriate';
  const REPORTED_COMMENT_CONTENT = 'I am rage-baiting';

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
      {
        provide: POST_REPOSITORY_TOKEN,
        useValue: mockPostsRepo,
      },
      {
        provide: COMMENT_REPOSITORY_TOKEN,
        useValue: mockCommentsRepo,
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

      for (let i = 0; i < historyForReport.length; i++) {
        const reportHistoryChange = report.history[i];
        expect(reportHistoryChange.note).toBe(historyForReport[0].note);
        expect(reportHistoryChange.moderatorId).toBe(
          historyForReport[i].moderatorId
        );
      }
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

  describe('create()', () => {
    it('should create a PENDING report with createdAt being the current datetime', async () => {
      const now = new Date();

      await mockCommentReportsRepo.deleteMany({});

      const createdReport = await commentReportsService.create({
        commentId: reportedComment.id,
        postId: reportedComment.postId,
        reason: REPORT_REASON,
        reporterId: author.id,
      });

      expect(mockCommentReportsRepo.create).toHaveBeenCalledTimes(1);

      expect(createdReport.reason).toBe(REPORT_REASON);
      expect(createdReport.status).toBe('PENDING');
      // Check date and time down to minutes
      expect(createdReport.createdAt.toISOString().slice(0, 16)).toBe(
        now.toISOString().slice(0, 16)
      );
    });

    it('should not allow the same user to make a second report on a comment', async () => {
      expect.assertions(1);
      return commentReportsService
        .create({
          reason: REPORT_REASON,
          reporterId: reportByAuthor.reporterId,
          postId: reportedComment.postId,
          commentId: reportedComment.id,
        })
        .catch((error) => {
          expect(error.message).toMatch(
            ERROR_MESSAGES[ERROR_CODES.VALIDATION.REPORT_EXISTS]
          );
        });
    });

    it('should not allow the same user that made the comment, to report it', async () => {
      expect.assertions(1);
      return commentReportsService
        .create({
          reason: REPORT_REASON,
          reporterId: reportedComment.userId,
          postId: reportedComment.postId,
          commentId: reportedComment.id,
        })
        .catch((error) => {
          expect(error.message).toMatch(
            ERROR_MESSAGES[ERROR_CODES.SERVER.FORBIDDEN]
          );
        });
    });

    test.each([
      [
        'is too long',
        generateRandomString(REPORT_CONSTRAINTS.MAX_REASON_LENGTH + 1),
      ],
    ])(
      'should throw validation error when report reason field %s',
      async (_, reason) => {
        expect.assertions(1);
        return commentReportsService
          .create({
            reason,
            reporterId: admin.id,
            postId: publishedPost.id,
            commentId: reportedComment.id,
          })
          .catch((error) => {
            expect(error.message).toMatch(/failed.*validation/i);
          });
      }
    );

    test.each([
      ['is null', null],
      ['is undefined', undefined],
      ['is empty string', ''],
    ])(
      'should throw validation error when commentId %s',
      async (_, commentId) => {
        expect.assertions(1);
        return commentReportsService
          .create({
            reason: REPORT_REASON,
            reporterId: admin.id,
            postId: publishedPost.id,
            commentId: commentId as any,
          })
          .catch((error) => {
            expect(error.message).toMatch(/failed.*validation/i);
          });
      }
    );

    test.each([
      ['is null', null],
      ['is undefined', undefined],
      ['is empty string', ''],
    ])(
      'should throw validation error when reporterId %s',
      async (_, reporterId) => {
        expect.assertions(1);
        return commentReportsService
          .create({
            reason: REPORT_REASON,
            reporterId: reporterId as any,
            postId: publishedPost.id,
            commentId: reportedComment.id,
          })
          .catch((error) => {
            expect(error.message).toMatch(/failed.*validation/i);
          });
      }
    );

    test.each([
      ['is null', null],
      ['is undefined', undefined],
      ['is empty string', ''],
    ])('should throw validation error when postId %s', async (_, id) => {
      return commentReportsService
        .create({
          reason: REPORT_REASON,
          reporterId: admin.id,
          postId: id as any,
          commentId: reportedComment.id,
        })
        .catch((error) => {
          expect(error.message).toMatch(/failed.*validation/i);
        });
    });

    it('should throw when comment with that id does not exist', async () => {
      expect.assertions(1);
      return commentReportsService
        .create({
          reason: REPORT_REASON,
          reporterId: admin.id,
          postId: reportedComment.postId,
          commentId: 9999,
        })
        .catch((error) => {
          expect(error.message).toMatch(
            ERROR_MESSAGES[ERROR_CODES.SERVER.NOT_FOUND]
          );
        });
    });

    it('should throw when user with that id does not exist', async () => {
      expect.assertions(1);
      return commentReportsService
        .create({
          reason: REPORT_REASON,
          reporterId: 9999,
          postId: reportedComment.postId,
          commentId: reportedComment.id,
        })
        .catch((error) => {
          expect(error.message).toMatch(
            ERROR_MESSAGES[ERROR_CODES.VALIDATION.USER_MISSING]
          );
        });
    });

    it('should throw when post with that id does not exist', async () => {
      expect.assertions(1);
      return commentReportsService
        .create({
          reason: REPORT_REASON,
          reporterId: admin.id,
          postId: 9999,
          commentId: reportedComment.id,
        })
        .catch((error) => {
          expect(error.message).toMatch(
            ERROR_MESSAGES[ERROR_CODES.SERVER.NOT_FOUND]
          );
        });
    });

    it(`should throw when post with that id exist but it's status
       is not PUBLISHED and user requesting it is not ADMIN, MOD or AUTHOR`, async () => {
      await client.comment.update({
        where: {
          id: reportedComment.id,
        },
        data: {
          postId: draftAuthorPost.id,
        },
      });

      expect.assertions(1);
      return commentReportsService
        .create({
          reason: REPORT_REASON,
          reporterId: user.id,
          postId: draftAuthorPost.id,
          commentId: reportedComment.id,
        })
        .catch((error) => {
          expect(error.message).toMatch(
            ERROR_MESSAGES[ERROR_CODES.SERVER.FORBIDDEN]
          );
        });
    });

    test.each([
      ['user is ADMIN', 'ADMIN'],
      ['user is MOD', 'MOD'],
      ['user is the author of the private post', 'AUTHOR'],
    ])(
      'should allow to create reports on private posts when %s',
      async (_, role) => {
        const commentForReportOnPrivatePost = await mockCommentsRepo.create({
          content: 'RANDOM COMMENT',
          createdAt: new Date(),
          depth: 0,
          postId: draftAuthorPost.id,
          threadParentId: null,
          updatedAt: new Date(),
          userId: user.id,
        });

        const users = [mod, user, author, admin];
        const reporter = users.find((u) => u.role === role);

        if (!reporter) throw new Error('Missing test user');

        const report = await commentReportsService.create({
          commentId: commentForReportOnPrivatePost.id,
          postId: draftAuthorPost.id,
          reporterId: reporter.id,
          reason: REPORT_REASON,
        });

        expect(report).toBeDefined();
        expect(mockCommentReportsRepo.create).toHaveBeenCalledTimes(1);
      }
    );
  });
});
