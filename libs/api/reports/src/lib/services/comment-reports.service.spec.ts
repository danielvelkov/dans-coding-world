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
  ReportStatus,
  ReportStatusEnum,
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
import {
  generateRandomString,
  getKey,
  randomInteger,
  randomSelect,
} from '@dans-coding-world/helpers';
import { FilterReportsByDto } from '@dans-coding-world/shared-report-dto';

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
      { author: author, visibility: 'PUBLIC', status: 'DRAFT' },
    ];

    [publishedPost, draftAuthorPost] = await Promise.all(
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

  describe('getAll()', () => {
    let mockReports: ReportDetail[];
    let reporters: User[];
    let postsWithReports: Post[];

    beforeEach(async () => {
      await mockCommentsRepo.deleteMany({});
      await mockCommentReportsRepo.deleteMany({});

      reporters = [admin, mod, author, maliciousUser];

      const allComments: Comment[] = [];

      postsWithReports = [publishedPost, draftAuthorPost];

      for (const post of postsWithReports) {
        const randomNumOfComments = randomInteger(2, 5);

        for (let i = 0; i < randomNumOfComments; i++) {
          const commenter = randomSelect(reporters);

          const comment = await mockCommentsRepo.create({
            content: `Comment ${i} on post ${post.id}`,
            postId: post.id,
            userId: commenter.id,
            depth: 0,
            threadParentId: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          allComments.push(comment);
        }
      }

      const reportsToCreate: Omit<Report, 'id' | 'createdAt'>[] = [];

      for (let i = 0; i < 30; i++) {
        const randomComment = randomSelect(allComments);

        // Select a reporter that IS NOT the comment's author
        const validReporters = reporters.filter(
          (u) => u.id !== randomComment.userId
        );

        const randomReporter: User = randomSelect(validReporters);

        const randomStatus = randomSelect(Object.values(ReportStatusEnum));

        reportsToCreate.push({
          reason: `Report ${i}: ${randomStatus}`,
          status: randomStatus,
          commentId: randomComment.id,
          reporterId: randomReporter.id,
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

      await Promise.all(
        finalReports.map((r) =>
          mockCommentReportsRepo.create({
            ...r,
            createdAt: new Date(
              Date.now() + Math.floor(Math.random() * 100) * 1000 * 60 // between 1-100 min difference
            ),
          })
        )
      );

      // Fetch all created reports to use in the tests
      mockReports = (await mockCommentReportsRepo.search({})) as ReportDetail[];
    });

    it('should return only pending reports if no filter is specified', async () => {
      const { items } = await commentReportsService.getAll({
        pageSize: pageSizeOptions[2],
      });

      for (const report of items) {
        expect(report.status).toBe('PENDING');
      }
    });

    test.each([
      [
        {
          status: ['PENDING'] as ReportStatus[],
        },
      ],
      [
        {
          status: ['PENDING', 'DISMISSED'] as ReportStatus[],
        },
      ],
      [
        {
          status: ['RESOLVED'] as ReportStatus[],
        },
      ],
      [
        {
          status: ['REVIEWING'] as ReportStatus[],
        },
      ],
      [
        {
          maliciousUserId: 1, // index 1 of user array
        },
      ],

      [
        {
          status: ['PENDING'] as ReportStatus[],
          maliciousUserId: 2, // index 2 of user array
        },
      ],
      [
        {
          status: ['PENDING', 'RESOLVED'] as ReportStatus[],
          maliciousUserId: 3, // index 3 of user array
        },
      ],
      [
        {
          status: ['PENDING', 'RESOLVED'] as ReportStatus[],
          postId: 1, // index 1 of post array
        },
      ],
      [
        {
          postId: 2, // index 2 of post array
        },
      ],
      [
        {
          status: ['REVIEWING', 'DISMISSED'] as ReportStatus[],
          postId: 1, // index 1 of post array
        },
      ],
      [
        {
          maliciousUserId: 4,
          postId: 2,
        },
      ],
      [
        {
          status: ['RESOLVED'] as ReportStatus[],
          maliciousUserId: 1,
          postId: 1,
        },
      ],
      [
        {
          status: [
            'PENDING',
            'REVIEWING',
            'RESOLVED',
            'DISMISSED',
          ] as ReportStatus[],
        },
      ],
      [
        {
          status: [
            'PENDING',
            'REVIEWING',
            'RESOLVED',
            'DISMISSED',
          ] as ReportStatus[],
          postId: 2, // index 2 of post array
        },
      ],
    ])(
      `should return the right reports after filtering by:
      -  %j `,
      async (filterBy: FilterReportsByDto) => {
        if (filterBy.maliciousUserId)
          filterBy.maliciousUserId = reporters[filterBy.maliciousUserId - 1].id;

        if (filterBy.postId)
          filterBy.postId = postsWithReports[filterBy.postId - 1].id;

        const total = getExpectedReportCount(mockReports, filterBy);

        const { items, pagination } = await commentReportsService.getAll({
          pageSize: pageSizeOptions[2],
          filterBy,
        });

        for (const report of items) {
          if (filterBy.maliciousUserId)
            expect(report.reportedComment.userId).toBe(
              filterBy.maliciousUserId
            );

          if (filterBy.postId)
            expect(report.reportedComment.postId).toBe(filterBy.postId);

          if (filterBy.status)
            expect(filterBy.status.includes(report.status)).toBe(true);
        }

        expect(pagination.total).toBe(total);
      }
    );

    test.each([
      ['negative page size', -1, 0],
      ['negative offset', 10, -1],
      ['floating point page size', 0.1, 0],
      ['floating point offset', 10, 2.5],
      ['string as page size', '0', 0],
      ['page size that is not allowed', 99, 0],
    ])('should throw when %s is set', async (_, pageSize, pageOffset) => {
      expect.assertions(1);
      return commentReportsService
        .getAll({ pageSize: pageSize as any, pageOffset })
        .catch((error) => {
          expect(error.message).toMatch(
            ERROR_MESSAGES[ERROR_CODES.VALIDATION.VALIDATION_ERROR]
          );
        });
    });

    test.each(['ANALYZING', 'POWER_TRIPPING', ''])(
      'should throw when filtering by unknown report status',
      async (status) => {
        expect.assertions(1);
        return commentReportsService
          .getAll({
            filterBy: {
              status: [status as any],
            },
          })
          .catch((error) => {
            expect(error.message).toMatch(/failed.*validation/i);
          });
      }
    );

    test.each([
      ['is empty array', []],
      ['is object', {}],
    ])(
      'should throw validation error when filterBy status %s',
      async (_, status) => {
        expect.assertions(1);
        return commentReportsService
          .getAll({
            filterBy: {
              status: status as any,
            },
          })
          .catch((error) => {
            expect(error.message).toMatch(/failed.*validation/i);
          });
      }
    );

    test.each([
      ['contain invalid key', { invalidKey: 'asc' }],
      ['specify invalid direction', { createdAt: 'invalid' }],
      ['specify valid direction but in the wrong case ', { createdAt: 'ASC' }],
      ['specify valid direction but in an array', { createdAt: ['asc'] }],
    ])('should throw when sorting options %s', async (_, sortBy) => {
      expect.assertions(1);

      return commentReportsService
        .getAll({
          sortBy: sortBy as any,
        })
        .catch((error) => {
          expect(error.message).toMatch(
            ERROR_MESSAGES[ERROR_CODES.VALIDATION.VALIDATION_ERROR]
          );
        });
    });

    test.each([
      ['created date (DESC)', getKey<Report>('createdAt'), true],
      ['created date (ASC)', getKey<Report>('createdAt'), false],
    ])(
      'should sort items provided that sorting by %s is applied',
      async (_, propName, isDescending: boolean) => {
        const res = await commentReportsService.getAll({
          sortBy: {
            [propName]: isDescending ? 'desc' : 'asc',
          },
        });
        const sortedItems = [...res.items].sort((prev, next) => {
          if (!prev[propName] || !next[propName]) return 0;
          const prevDate = (prev[propName] as Date).getTime();
          const nextDate = (next[propName] as Date).getTime();
          return isDescending ? nextDate - prevDate : prevDate - nextDate;
        });

        sortedItems.forEach((post, i) => {
          expect(post.id).toBe(res.items[i].id);
        });
      }
    );

    const pageSizeOptions = PAGINATION.REPORTS.ITEMS_PER_PAGE_OPTIONS;

    test.each([
      [2, pageSizeOptions[0]],
      [4, pageSizeOptions[0]],
      [21, pageSizeOptions[1]],
      [49, pageSizeOptions[2]],
    ])(
      'should throw when pagination offset (%s) is not divisible by page size (%s)',
      async (pageOffset, pageSize) => {
        expect.assertions(1);
        return commentReportsService
          .getAll({ pageOffset, pageSize })
          .catch((error) => {
            expect(error.message).toMatch(
              ERROR_MESSAGES[ERROR_CODES.VALIDATION.VALIDATION_ERROR]
            );
          });
      }
    );

    test.each([
      [1, 0, pageSizeOptions[0]],
      [2, pageSizeOptions[0], pageSizeOptions[0]],
      [3, pageSizeOptions[0] * 2, pageSizeOptions[0]],
      [2, pageSizeOptions[1], pageSizeOptions[1]],
    ])(
      'should return page #%s when [ offset: %s ; pageLimit %s ]',
      async (expectedPageNum, pageOffset, pageSize) => {
        const resDto = await commentReportsService.getAll({
          pageOffset,
          pageSize,
        });
        expect(resDto.pagination.limit).toBe(pageSize);
        expect(resDto.pagination.page).toBe(expectedPageNum);
      }
    );
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

  describe('updateStatus()', () => {
    it('should add update entry in report moderation history', async () => {
      const MOD_NOTE = 'checking report out';

      const report = (await commentReportsService.updateStatus({
        moderatorId: mod.id,
        reportId: reportByAuthor.id,
        status: 'REVIEWING',
        note: MOD_NOTE,
      })) as ReportDetail;

      const reportHistoryEntry = await client.reportHistory.findFirst({
        where: {
          note: MOD_NOTE,
          newStatus: 'REVIEWING',
          previousStatus: reportByAuthor.status,
        },
      });
      if (!reportHistoryEntry) throw new Error('Failed');

      expect(reportHistoryEntry).toBeDefined();

      // Report should contain: History by far + new entry
      expect(report.history.length).toBe(historyForReport.length + 1);
      expect(
        report.history.map((e) => e.id).includes(reportHistoryEntry?.id)
      ).toBe(true);
      expect(
        report.history.map((e) => e.note).includes(historyForReport[0].note)
      ).toBe(true);
    });

    it('should throw error when updating report to the same status', async () => {
      expect.assertions(1);
      return commentReportsService
        .updateStatus({
          reportId: reportByAuthor.id,
          moderatorId: mod.id,
          status: reportByAuthor.status,
        })
        .catch((error) => {
          expect(error.message).toMatch(VALIDATION_MESSAGES.reports.sameStatus);
        });
    });

    it('should throw error when moderatorId matches the user who got reported', async () => {
      expect.assertions(1);
      return commentReportsService
        .updateStatus({
          reportId: reportByAuthor.id,
          moderatorId: reportedComment.userId,
          status: 'RESOLVED',
        })
        .catch((error) => {
          expect(error.message).toMatch(
            ERROR_MESSAGES[ERROR_CODES.SERVER.FORBIDDEN]
          );
        });
    });

    test.each(['ANALYZING', 'POWER_TRIPPING'])(
      'should throw when setting unknown status',
      async (status) => {
        expect.assertions(1);
        return commentReportsService
          .updateStatus({
            reportId: reportByAuthor.id,
            moderatorId: mod.id,
            status: status as any,
          })
          .catch((error) => {
            expect(error.message).toMatch(/failed.*validation/i);
          });
      }
    );

    it('should throw when report with that id does not exist', async () => {
      expect.assertions(1);
      return commentReportsService
        .updateStatus({
          reportId: 9999,
          moderatorId: mod.id,
          status: 'REVIEWING',
        })
        .catch((error) => {
          expect(error.message).toMatch(
            ERROR_MESSAGES[ERROR_CODES.SERVER.NOT_FOUND]
          );
        });
    });

    test.each([
      [
        'is too long',
        generateRandomString(REPORT_CONSTRAINTS.MAX_REASON_LENGTH + 1),
      ],
    ])('should throw validation error when note field %s', async (_, note) => {
      expect.assertions(1);
      return commentReportsService
        .updateStatus({
          note: note as any,
          moderatorId: mod.id,
          reportId: reportByAuthor.id,
          status: 'RESOLVED',
        })
        .catch((error) => {
          expect(error.message).toMatch(/failed.*validation/i);
        });
    });

    test.each([
      ['is null', null],
      ['is undefined', undefined],
      ['is empty string', ''],
    ])(
      'should throw validation error when moderatorId %s',
      async (_, modId) => {
        expect.assertions(1);
        return commentReportsService
          .updateStatus({
            note: REPORT_REASON,
            moderatorId: modId as any,
            reportId: reportByAuthor.id,
            status: 'RESOLVED',
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
      'should throw validation error when reportId %s',
      async (_, reportId) => {
        expect.assertions(1);
        return commentReportsService
          .updateStatus({
            note: REPORT_REASON,
            moderatorId: mod.id,
            reportId: reportId as any,
            status: 'RESOLVED',
          })
          .catch((error) => {
            expect(error.message).toMatch(/failed.*validation/i);
          });
      }
    );
  });

  describe('delete()', () => {
    it('should delete report and its related report history', async () => {
      const report = await commentReportsService.delete({
        reportId: reportByAuthor.id,
      });
      expect(report.id).toBe(reportByAuthor.id);

      expect(mockCommentReportsRepo.delete).toHaveBeenCalledTimes(1);

      expect(
        await client.report.count({
          where: {
            id: reportByAuthor.id,
          },
        })
      ).toBe(0);
      expect(
        await client.reportHistory.count({
          where: {
            reportId: reportByAuthor.id,
          },
        })
      ).toBe(0);
    });

    it('should not delete reported comment entity and reporter', async () => {
      await commentReportsService.delete({
        reportId: reportByAuthor.id,
      });

      expect(
        await client.comment.count({
          where: {
            id: reportByAuthor.commentId,
          },
        })
      ).toBe(1);
      expect(
        await client.user.count({
          where: {
            id: reportByAuthor.reporterId,
          },
        })
      ).toBe(1);
    });

    test.each([
      ['is null', null],
      ['is undefined', undefined],
      ['is empty string', ''],
    ])(
      'should throw validation error when reportId %s',
      async (_, reportId) => {
        expect.assertions(1);
        return commentReportsService
          .delete({
            reportId: reportId as any,
          })
          .catch((error) => {
            expect(error.message).toMatch(/failed.*validation/i);
          });
      }
    );
  });

  it('should throw when report with that id does not exist', async () => {
    expect.assertions(1);
    return commentReportsService
      .delete({
        reportId: 9999,
      })
      .catch((error) => {
        expect(error.message).toMatch(
          ERROR_MESSAGES[ERROR_CODES.SERVER.NOT_FOUND]
        );
      });
  });
});

/**
 * Get expected total according to CommentReportsService buildReportsWhereClause()
 *
 * @param reports The complete array of all reports in the database.
 * @param filters Explicit filters provided by the user (from DTO).
 * @returns The total number of reports that should be visible.
 */
export function getExpectedReportCount(
  reports: ReportDetail[],
  filters?: FilterReportsByDto
): number {
  let filteredReports = [...reports]; // Start with all posts

  /**
   * STEP 1: Default Filters - Apply only if no explicit filtering is specified
   * (Initializes 'filters' for Step 2)
   */
  let effectiveFilters = filters;

  if (!effectiveFilters || Object.keys(effectiveFilters).length === 0) {
    // Default to pending reports
    effectiveFilters = {
      status: ['PENDING'],
    };
  }

  /**
   * STEP 2: Explicit Filters - What DOES the user want to see?
   * (Applies the combined explicit/default filters)
   */
  if (effectiveFilters) {
    // 2a. Filtering by status
    if (effectiveFilters.status && effectiveFilters.status.length > 0) {
      filteredReports = filteredReports.filter((r) =>
        effectiveFilters.status?.includes(r.status)
      );
    }

    // 2b. Filtering by post id
    if (effectiveFilters.postId) {
      filteredReports = filteredReports.filter(
        (r) => r.reportedComment.postId === effectiveFilters.postId
      );
    }

    // 2c. Filtering by malicious user id
    if (effectiveFilters.maliciousUserId) {
      filteredReports = filteredReports.filter(
        (r) => r.reportedComment.userId === effectiveFilters.maliciousUserId
      );
    }
  }
  return filteredReports.length;
}
