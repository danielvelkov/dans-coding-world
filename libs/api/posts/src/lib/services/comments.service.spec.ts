/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';
import { ICommentsService } from '../interfaces/comments-service.interface.js';
import {
  COMMENT_REPOSITORY_TOKEN,
  CommentsService,
} from './comments.service.js';
import {
  ICommentRepository,
  IPostRepository,
  IUserRepository,
} from '@dans-coding-world/shared-data-access-interfaces';
import {
  Post,
  PostOrderByInput,
  PostWhereInput,
  User,
  client,
  Comment,
  CommentWhereInput,
  CommentsOrderByInput,
  Role,
  PostStatus,
  PostVisibility,
  CommentWithReplies,
} from '@dans-coding-world/prisma-schema';
import { ReflectiveInjector } from 'injection-js';
import { PrismaPostDataAccess as MockPostRepository } from '@dans-coding-world/post-data-access';
import { PrismaUserDataAccess as MockUserRepository } from '@dans-coding-world/user-data-access';
import { PrismaPostCommentsDataAccess as MockCommentsRepository } from '@dans-coding-world/post-data-access';
import {
  COMMENT_CONSTRAINTS,
  ERROR_CODES,
  ERROR_MESSAGES,
  PAGINATION,
} from '@dans-coding-world/shared-constants';
import {
  POST_REPOSITORY_TOKEN,
  PostsService,
  USER_REPOSITORY_TOKEN,
} from './posts.service.js';
import { generateRandomString, getKey } from '../helper/util.js';

let mockCommentsRepository: ICommentRepository<
  Comment,
  CommentWhereInput,
  CommentsOrderByInput
>;
let mockUsersRepo: IUserRepository;
let mockPostsRepo: IPostRepository<Post, PostWhereInput, PostOrderByInput>;
let injector: ReflectiveInjector;
let commentsService: ICommentsService;

describe('CommentsService', () => {
  let user: User;
  let author: User;
  let admin: User;
  let mod: User;

  let publishedPost: Post;
  let draftAuthorPost: Post;
  let membersOnlyAdminPost: Post;

  const validPostContent = {
    title: 'Vary valid title',
    content: 'Very valid description',
    createdAt: new Date(),
    publishedAt: null,
    updatedAt: new Date(),
  };

  const validCommentContent = {
    content: 'Very valid comment',
    createdAt: new Date(),
    updatedAt: new Date(),
    depth: 0,
  };

  beforeEach(async () => {
    await client.user.deleteMany();

    mockUsersRepo = new MockUserRepository();
    mockPostsRepo = new MockPostRepository();
    mockCommentsRepository = new MockCommentsRepository();

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
      PostsService,
      CommentsService,
      {
        provide: USER_REPOSITORY_TOKEN,
        useValue: mockUsersRepo,
      },
      {
        provide: POST_REPOSITORY_TOKEN,
        useValue: mockPostsRepo,
      },
      {
        provide: COMMENT_REPOSITORY_TOKEN,
        useValue: mockCommentsRepository,
      },
    ]);
    commentsService = injector.get(CommentsService) as CommentsService;

    jest.spyOn(mockCommentsRepository, 'create');
    jest.spyOn(mockCommentsRepository, 'delete');
    jest.spyOn(mockCommentsRepository, 'update');
  });

  describe('getPostComments()', () => {
    const NUM_OF_ADMIN_COMMENTS = 25;
    const NUM_OF_AUTHOR_COMMENTS = 15;

    const MEMBERS_ONLY_POST_COMMENTS_COUNT = 10;
    const DRAFT_POST_COMMENTS_COUNT = 5;

    const PUBLISHED_POST_COMMENTS_COUNT =
      NUM_OF_ADMIN_COMMENTS + NUM_OF_AUTHOR_COMMENTS;

    beforeEach(async () => {
      await mockCommentsRepository.deleteMany({});

      const commentsForCreation: {
        post: Post;
        author: User;
        count: number;
      }[] = [
        { author: admin, post: publishedPost, count: NUM_OF_ADMIN_COMMENTS },
        { author: author, post: publishedPost, count: NUM_OF_AUTHOR_COMMENTS },
        {
          author: admin,
          post: membersOnlyAdminPost,
          count: MEMBERS_ONLY_POST_COMMENTS_COUNT,
        },
        {
          author: user,
          post: draftAuthorPost,
          count: DRAFT_POST_COMMENTS_COUNT,
        },
      ];

      await Promise.all(
        commentsForCreation
          .map((comment, i) =>
            Array.from({ length: comment.count }).map(() =>
              mockCommentsRepository.create({
                ...validCommentContent,
                userId: comment.author.id,
                postId: comment.post.id,
                threadParentId: null,
                createdAt: new Date(
                  Date.now() + i * 1000 * 60 * 3 // 3 minutes between
                ),
              })
            )
          )
          .flat()
      );
    });

    it(`should return post's comments and their pagination metadata, 
      with comments ordered by created date (DESC)`, async () => {
      const res = await commentsService.getPostComments({
        postId: publishedPost.id,
        viewerId: admin.id,
      });

      expect(res.count).toBe(PAGINATION.COMMENTS.DEFAULT_ITEMS_PER_PAGE);
      expect(res.pagination.total).toBe(PUBLISHED_POST_COMMENTS_COUNT);

      const itemsSortedByCreatedDateDesc = [...res.items].sort((prev, next) => {
        const prevDate = prev.createdAt.getTime();
        const nextDate = next.createdAt.getTime();
        return nextDate - prevDate;
      });

      itemsSortedByCreatedDateDesc.forEach((comment, i) => {
        expect(comment.id).toBe(res.items[i].id);
      });
    });

    it(`should return the top-level replies and
       replyCount for each retrieved post comment`, async () => {
      const resWithoutReplies = await commentsService.getPostComments({
        postId: publishedPost.id,
        viewerId: admin.id,
      });

      expect(resWithoutReplies.pagination.total).toBe(
        PUBLISHED_POST_COMMENTS_COUNT
      );
      expect(resWithoutReplies.items.every((c) => c.replyCount === 0)).toBe(
        true
      );

      const commentIdAndReplyCountMap = new Map();

      for (const comment of resWithoutReplies.items) {
        let randomNumOfComments = Math.floor(Math.random() * 10) + 1;
        commentIdAndReplyCountMap.set(comment.id, randomNumOfComments);

        while (randomNumOfComments--)
          await mockCommentsRepository.create({
            ...validCommentContent,
            postId: publishedPost.id,
            depth: 1,
            userId: admin.id,
            threadParentId: comment.id,
          });
      }

      const resWithReplies = await commentsService.getPostComments({
        postId: publishedPost.id,
        viewerId: admin.id,
      });

      expect(
        resWithReplies.items.every(
          (c) => c.replyCount === commentIdAndReplyCountMap.get(c.id)
        )
      ).toBe(true);
    });

    test.each([
      ['created date (ASC)', getKey<Comment>('createdAt'), false],
      ['created date (DESC)', getKey<Comment>('createdAt'), true],
      ['updated date (ASC)', getKey<Comment>('updatedAt'), false],
      ['updated date (DESC)', getKey<Comment>('updatedAt'), true],
    ])(
      'should sort comments provided that sorting by %s is applied',
      async (_, propName, isAscending: boolean) => {
        const res = await commentsService.getPostComments({
          sortBy: {
            [propName]: isAscending ? 'asc' : 'desc',
          },
          postId: publishedPost.id,
        });
        const sortedItems = [...res.items].sort((prev, next) => {
          if (!prev[propName] || !next[propName]) return 0;
          const prevDate = (prev[propName] as Date).getTime();
          const nextDate = (next[propName] as Date).getTime();
          return isAscending ? prevDate - nextDate : nextDate - prevDate;
        });

        sortedItems.forEach((comment, i) => {
          expect(comment.id).toBe(res.items[i].id);
        });
      }
    );

    test.each([
      ['contains invalid key', { invalidKey: 'asc' }],
      ['specify invalid direction', { createdAt: 'invalid' }],
      ['specify valid direction but in the wrong case ', { createdAt: 'ASC' }],
      ['specify valid direction but in an array', { createdAt: ['asc'] }],
    ])('should throw when sorting options %s', async (_, sortBy) => {
      expect.assertions(1);

      return commentsService
        .getPostComments({
          postId: publishedPost.id,
          sortBy: sortBy as any,
        })
        .catch((error) => {
          expect(error.message).toMatch(
            ERROR_MESSAGES[ERROR_CODES.VALIDATION.VALIDATION_ERROR]
          );
        });
    });

    test.each([
      ['negative page size', -1, 0],
      ['negative offset', 10, -1],
      ['floating point page size', 0.1, 0],
      ['floating point offset', 10, 2.5],
      ['page size that is not allowed', 99, 0],
    ])('should throw when %s is set', async (_, pageSize, pageOffset) => {
      expect.assertions(1);
      return commentsService
        .getPostComments({
          postId: publishedPost.id,
          viewerId: admin.id,
          pageSize: pageSize as any,
          pageOffset,
        })
        .catch((error) => {
          expect(error.message).toMatch(
            ERROR_MESSAGES[ERROR_CODES.VALIDATION.VALIDATION_ERROR]
          );
        });
    });

    const pageSizeOptions = PAGINATION.COMMENTS.ITEMS_PER_PAGE_OPTIONS;

    test.each([
      [2, pageSizeOptions[0]],
      [4, pageSizeOptions[0]],
      [21, pageSizeOptions[1]],
      [49, pageSizeOptions[2]],
    ])(
      'should throw when pagination offset (%s) is not divisible by page size (%s)',
      async (pageOffset, pageSize) => {
        expect.assertions(1);
        return commentsService
          .getPostComments({ pageOffset, pageSize, postId: publishedPost.id })
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
      'should return page #%s when [ offset: %s ; pageLimit: %s ]',
      async (expectedPageNum, pageOffset, pageSize) => {
        const resDto = await commentsService.getPostComments({
          pageOffset,
          pageSize,
          postId: publishedPost.id,
        });
        expect(resDto.pagination.limit).toBe(pageSize);
        expect(resDto.pagination.page).toBe(expectedPageNum);
      }
    );

    test.each([
      ['is null', null],
      ['is undefined', undefined],
      ['is empty string', ''],
    ])('should throw validation error when postId %s', async (_, id) => {
      expect.assertions(1);
      return commentsService
        .getPostComments({
          viewerId: admin.id,
          postId: id as any,
        })
        .catch((error) => {
          expect(error.message).toMatch(/failed.*validation/i);
        });
    });

    it('should throw when post with that id does not exist', async () => {
      expect.assertions(1);
      return commentsService
        .getPostComments({
          postId: 9999,
        })
        .catch((error) => {
          expect(error.message).toMatch(
            ERROR_MESSAGES[ERROR_CODES.SERVER.NOT_FOUND]
          );
        });
    });

    test.each([
      ['is not a number', 'a'],
      ['is array', []],
      ['non numeric strings', 'a1'],
    ])(
      'should throw validation error when viewerId param %s',
      async (_, id) => {
        expect.assertions(1);
        return commentsService
          .getPostComments({
            postId: publishedPost.id,
            viewerId: id as any,
          })
          .catch((error) => {
            expect(error.message).toMatch(
              ERROR_MESSAGES[ERROR_CODES.VALIDATION.VALIDATION_ERROR]
            );
          });
      }
    );

    it('should throw when user specified viewerId does not exist', async () => {
      expect.assertions(1);
      return commentsService
        .getPostComments({
          postId: publishedPost.id,
          viewerId: 9999,
        })
        .catch((error) => {
          expect(error.message).toMatch(
            ERROR_MESSAGES[ERROR_CODES.VALIDATION.USER_MISSING]
          );
        });
    });

    it(`should throw when post with that id exist, but it's status is not PUBLISHED`, async () => {
      expect.assertions(1);
      return commentsService
        .getPostComments({
          postId: draftAuthorPost.id,
        })
        .catch((error) => {
          expect(error.message).toMatch(
            ERROR_MESSAGES[ERROR_CODES.SERVER.FORBIDDEN]
          );
        });
    });

    it(`should throw when post is MEMBERS-ONLY, and no userId is provided`, async () => {
      expect.assertions(1);
      return commentsService
        .getPostComments({
          postId: membersOnlyAdminPost.id,
        })
        .catch((error) => {
          expect(error.message).toMatch(
            ERROR_MESSAGES[ERROR_CODES.AUTH.UNAUTHORIZED]
          );
        });
    });

    it(`should return comments for MEMBERS-ONLY post if viewer Id is provided`, async () => {
      const res = await commentsService.getPostComments({
        postId: membersOnlyAdminPost.id,
        viewerId: admin.id,
      });

      expect(res.count).toBe(PAGINATION.COMMENTS.DEFAULT_ITEMS_PER_PAGE);
      expect(res.pagination.total).toBe(MEMBERS_ONLY_POST_COMMENTS_COUNT);
    });

    test.each(['ADMIN', 'MOD'])(
      `should return comments for any private post if viewer has role: %s`,
      async (role) => {
        const user = [admin, mod].find((u) => u.role === role);
        if (!user) throw new Error('Missing test user');

        const res = await commentsService.getPostComments({
          postId: draftAuthorPost.id,
          viewerId: user.id,
        });

        expect(res.pagination.total).toBe(DRAFT_POST_COMMENTS_COUNT);
      }
    );
  });

  describe('getComment()', () => {
    let comment: Comment;
    const COMMENT_CONTENT = generateRandomString(10);

    beforeEach(async () => {
      await mockCommentsRepository.deleteMany({});

      comment = await mockCommentsRepository.create({
        ...validCommentContent,
        content: COMMENT_CONTENT,
        postId: publishedPost.id,
        userId: admin.id,
        depth: 0,
        threadParentId: null,
      });
    });

    it(`should retrieve requested comment data without specifying userId, 
      when post is PUBLISHED and not MEMBERS_ONLY`, async () => {
      const res = await commentsService.getById({
        commentId: comment.id,
        postId: publishedPost.id,
      });
      expect(res.comment.content).toBe(COMMENT_CONTENT);
    });

    it('should retrieve comment replies and reply count', async () => {
      const REPLY_COUNT = 4;
      for (let i = 0; i < REPLY_COUNT; i++)
        await mockCommentsRepository.create({
          ...validCommentContent,
          content: 'Comment at depth ' + i,
          depth: 1,
          userId: comment.userId,
          postId: comment.postId,
          threadParentId: comment.id,
        });

      const res = await commentsService.getCommentReplies({
        commentId: comment.id,
        postId: comment.postId,
      });

      expect(res.comment.replies.length).toBe(REPLY_COUNT);
      expect(res.replyCount).toBe(REPLY_COUNT);
    });

    test.each([
      ['is null', null],
      ['is undefined', undefined],
      ['is empty string', ''],
    ])('should throw validation error when postId %s', async (_, id) => {
      expect.assertions(1);
      return commentsService
        .getById({
          viewerId: comment.userId,
          postId: id as any,
          commentId: comment.id,
        })
        .catch((error) => {
          expect(error.message).toMatch(/failed.*validation/i);
        });
    });

    test.each([
      ['is null', null],
      ['is undefined', undefined],
      ['is empty string', ''],
    ])('should throw validation error when commentId %s', async (_, id) => {
      expect.assertions(1);
      return commentsService
        .getById({
          viewerId: comment.userId,
          postId: comment.postId,
          commentId: id as any,
        })
        .catch((error) => {
          expect(error.message).toMatch(/failed.*validation/i);
        });
    });

    it('should throw when comment with that id does not exist', async () => {
      expect.assertions(1);
      return commentsService
        .getById({
          viewerId: comment.userId,
          commentId: 9999,
          postId: comment.postId,
        })
        .catch((error) => {
          expect(error.message).toMatch(
            ERROR_MESSAGES[ERROR_CODES.SERVER.NOT_FOUND]
          );
        });
    });

    it('should throw when post with that id does not exist', async () => {
      expect.assertions(1);
      return commentsService
        .getById({
          viewerId: comment.userId,
          commentId: comment.id,
          postId: 9999,
        })
        .catch((error) => {
          expect(error.message).toMatch(
            ERROR_MESSAGES[ERROR_CODES.SERVER.NOT_FOUND]
          );
        });
    });

    it(`should allow access to comment on an unpublished post when the
      viewerId is ADMIN, MOD or the post author`, async () => {
      const allowedUsers = [admin, mod, author];

      const comment = await mockCommentsRepository.create({
        ...validCommentContent,
        postId: draftAuthorPost.id,
        userId: user.id,
        depth: 0,
        threadParentId: null,
      });

      for (const user of allowedUsers) {
        const res = await commentsService.getById({
          postId: draftAuthorPost.id,
          viewerId: user.id,
          commentId: comment.id,
        });

        expect(res.comment.id).toBe(comment.id);
      }
    });

    it(`should throw when post is not PUBLISHED
      and the viewerId is not ADMIN, MOD or its author`, async () => {
      const comment = await mockCommentsRepository.create({
        ...validCommentContent,
        postId: draftAuthorPost.id,
        userId: user.id,
        depth: 0,
        threadParentId: null,
      });

      expect.assertions(1);
      return commentsService
        .getById({
          viewerId: comment.userId,
          commentId: comment.id,
          postId: comment.postId,
        })
        .catch((error) => {
          expect(error.message).toMatch(
            ERROR_MESSAGES[ERROR_CODES.SERVER.FORBIDDEN]
          );
        });
    });

    it(`should throw when post is MEMBERS-ONLY, and no userId is provided`, async () => {
      const comment = await mockCommentsRepository.create({
        ...validCommentContent,
        postId: membersOnlyAdminPost.id,
        userId: admin.id,
        depth: 0,
        threadParentId: null,
      });

      expect.assertions(1);
      return commentsService
        .getById({
          commentId: comment.id,
          postId: comment.postId,
        })
        .catch((error) => {
          expect(error.message).toMatch(
            ERROR_MESSAGES[ERROR_CODES.AUTH.UNAUTHORIZED]
          );
        });
    });
  });

  describe('create()', () => {
    beforeEach(async () => {
      await mockCommentsRepository.deleteMany({});
    });

    it('should add comment to the post when valid post comment data is provided', async () => {
      const createdComment = await commentsService.create({
        ...validCommentContent,
        userId: admin.id,
        postId: publishedPost.id,
      });
      expect(mockCommentsRepository.create).toHaveBeenCalledTimes(1);
      expect(createdComment.postId).toBe(publishedPost.id);
    });

    it('should add reply to a comment of the post when valid comment data is provided', async () => {
      const postComment = await commentsService.create({
        ...validCommentContent,
        userId: admin.id,
        postId: publishedPost.id,
      });
      const commentReply = await commentsService.create({
        content: 'I agree',
        userId: admin.id,
        postId: publishedPost.id,
        replyToCommentId: postComment.id,
      });
      expect(mockCommentsRepository.create).toHaveBeenCalledTimes(2);
      expect(commentReply.postId).toBe(publishedPost.id);
      expect(commentReply.threadParentId).toBe(postComment.id);
    });

    it('should set correct depth when replying to a reply', async () => {
      const postComment = await commentsService.create({
        ...validCommentContent,
        userId: admin.id,
        postId: publishedPost.id,
      });

      const commentReply = await commentsService.create({
        content: 'I agree',
        userId: admin.id,
        postId: publishedPost.id,
        replyToCommentId: postComment.id,
      });
      expect(commentReply.depth).toBe(1);

      const replyToTheReply = await commentsService.create({
        content: 'I disagree',
        userId: author.id,
        postId: publishedPost.id,
        replyToCommentId: commentReply.id,
      });

      expect(replyToTheReply.depth).toBe(2);
    });

    test.each([
      [
        'is too long',
        generateRandomString(COMMENT_CONSTRAINTS.MAX_CONTENT_LENGTH + 1),
      ],
      [
        'is too short',
        generateRandomString(COMMENT_CONSTRAINTS.MIN_CONTENT_LENGTH - 1),
      ],
      ['is empty', ''],
    ])(
      'should throw validation error when comment content %s',
      async (_, content) => {
        expect.assertions(1);
        return commentsService
          .create({
            content,
            userId: admin.id,
            postId: publishedPost.id,
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
    ])('should throw validation error when userId %s', async (_, id) => {
      expect.assertions(1);
      return commentsService
        .create({
          ...validCommentContent,
          userId: id as any,
          postId: publishedPost.id,
        })
        .catch((error) => {
          expect(error.message).toMatch(/failed.*validation/i);
        });
    });

    test.each([
      ['is null', null],
      ['is undefined', undefined],
      ['is empty string', ''],
    ])('should throw validation error when postId %s', async (_, id) => {
      expect.assertions(1);
      return commentsService
        .create({
          ...validCommentContent,
          userId: admin.id,
          postId: id as any,
        })
        .catch((error) => {
          expect(error.message).toMatch(/failed.*validation/i);
        });
    });

    it('should throw when post with that id does not exist', async () => {
      expect.assertions(1);
      return commentsService
        .create({
          ...validCommentContent,
          userId: admin.id,
          postId: 9999,
        })
        .catch((error) => {
          expect(error.message).toMatch(
            ERROR_MESSAGES[ERROR_CODES.SERVER.NOT_FOUND]
          );
        });
    });

    it(`should throw when post with that id exist but it's status
       is not PUBLISHED and user requesting it is not ADMIN or AUTHOR`, async () => {
      expect.assertions(1);
      return commentsService
        .create({
          ...validCommentContent,
          userId: user.id,
          postId: draftAuthorPost.id,
        })
        .catch((error) => {
          expect(error.message).toMatch(
            ERROR_MESSAGES[ERROR_CODES.SERVER.FORBIDDEN]
          );
        });
    });

    it('should throw when the replyTo comment Id does not exist ', async () => {
      expect.assertions(1);
      return commentsService
        .create({
          ...validCommentContent,
          userId: admin.id,
          postId: publishedPost.id,
          replyToCommentId: 9999,
        })
        .catch((error) => {
          expect(error.message).toMatch(
            ERROR_MESSAGES[ERROR_CODES.SERVER.NOT_FOUND]
          );
        });
    });

    it('should throw when replying to a comment from a different post', async () => {
      const otherPost = await mockPostsRepo.create({
        ...validPostContent,
        title: 'OTHER POST',
        authorId: admin.id,
        status: 'PUBLISHED',
        visibility: 'PUBLIC',
      });

      const commentOnOtherPost = await commentsService.create({
        ...validCommentContent,
        userId: admin.id,
        postId: otherPost.id,
      });

      expect.assertions(1);
      return commentsService
        .create({
          content: 'Reply to wrong post',
          userId: admin.id,
          postId: publishedPost.id,
          replyToCommentId: commentOnOtherPost.id, // from different post
        })
        .catch((error) => {
          expect(error.message).toMatch(
            ERROR_MESSAGES[ERROR_CODES.SERVER.NOT_FOUND]
          );
        });
    });
  });

  describe('delete()', () => {
    let adminComment: Comment;
    let userComment: Comment;

    beforeEach(async () => {
      await mockCommentsRepository.deleteMany({});

      adminComment = await mockCommentsRepository.create({
        ...validCommentContent,
        postId: publishedPost.id,
        userId: admin.id,
        depth: 0,
        threadParentId: null,
      });

      userComment = await mockCommentsRepository.create({
        ...validCommentContent,
        postId: publishedPost.id,
        userId: user.id,
        depth: 0,
        threadParentId: null,
      });
    });

    it('should delete comment on valid delete comment data provided', async () => {
      await commentsService.delete({
        postId: publishedPost.id,
        authorId: admin.id,
        commentId: adminComment.id,
      });
      expect(mockCommentsRepository.delete).toHaveBeenCalledTimes(1);
      const postComments = await commentsService.getPostComments({
        postId: publishedPost.id,
      });
      expect(
        postComments.items.map((c) => c.id).includes(adminComment.id)
      ).toBe(false);
    });

    it('should throw when the authorId provided is not the author of the comment', async () => {
      expect.assertions(1);
      return commentsService
        .delete({
          commentId: adminComment.id,
          authorId: author.id,
          postId: publishedPost.id,
        })
        .catch((error) => {
          expect(error.message).toMatch(
            ERROR_MESSAGES[ERROR_CODES.SERVER.FORBIDDEN]
          );
        });
    });

    test.each(['ADMIN', 'MOD'])(
      'should not throw when the authorId is either MOD or ADMIN',
      async (role) => {
        const user = [admin, mod].find((u) => u.role === role);
        if (!user) throw new Error('Missing test user');

        await commentsService.delete({
          commentId: userComment.id,
          postId: publishedPost.id,
          authorId: user.id,
        });
        expect(mockCommentsRepository.delete).toHaveBeenCalledTimes(1);
      }
    );

    it('should throw when the commentId provided does not exist', async () => {
      expect.assertions(1);
      return commentsService
        .delete({
          commentId: 999,
          authorId: admin.id,
          postId: publishedPost.id,
        })
        .catch((error) => {
          expect(error.message).toMatch(
            ERROR_MESSAGES[ERROR_CODES.SERVER.NOT_FOUND]
          );
        });
    });

    it(`should throw when the comment for deletion is on a 
      unpublished post and user is not the author, ADMIN or MOD`, async () => {
      await mockCommentsRepository.update(adminComment.id, {
        postId: draftAuthorPost.id,
      });

      expect.assertions(1);
      return commentsService
        .delete({
          commentId: userComment.id,
          authorId: user.id,
          postId: draftAuthorPost.id,
        })
        .catch((error) => {
          expect(error.message).toMatch(
            ERROR_MESSAGES[ERROR_CODES.SERVER.FORBIDDEN]
          );
        });
    });

    it('should also remove all related replies spanning from that comment thread', async () => {
      // First reply (depth 1)
      const replyAtDepth_1 = await mockCommentsRepository.create({
        ...validCommentContent,
        content: 'Comment at depth 1',
        depth: 1,
        userId: adminComment.userId,
        postId: adminComment.postId,
        threadParentId: adminComment.id,
      });

      // Reply to the reply (depth 2)
      const replyAtDepth_2 = await mockCommentsRepository.create({
        ...validCommentContent,
        content: 'Comment at depth 2',
        depth: 2,
        userId: adminComment.userId,
        postId: adminComment.postId,
        threadParentId: replyAtDepth_1.id,
      });

      await commentsService.delete({
        postId: publishedPost.id,
        authorId: admin.id,
        commentId: adminComment.id,
      });

      expect(mockCommentsRepository.delete).toHaveBeenCalledTimes(1);
      const postComments = await commentsService.getPostComments({
        postId: publishedPost.id,
      });
      expect(
        postComments.items.map((c) => c.id).includes(adminComment.id)
      ).toBe(false);

      for (const reply of [replyAtDepth_1, replyAtDepth_2])
        expect(await mockCommentsRepository.getById(reply.id)).toBeNull();
    });
  });

  describe('update()', () => {
    let adminComment: Comment;
    let userComment: Comment;

    const NEW_CONTENT = 'New content Yippee';
    beforeEach(async () => {
      await mockCommentsRepository.deleteMany({});

      adminComment = await mockCommentsRepository.create({
        ...validCommentContent,
        postId: publishedPost.id,
        userId: admin.id,
        depth: 0,
        threadParentId: null,
      });

      userComment = await mockCommentsRepository.create({
        ...validCommentContent,
        postId: publishedPost.id,
        userId: user.id,
        depth: 0,
        threadParentId: null,
      });
    });

    it('should update comment on valid update comment data provided', async () => {
      await commentsService.update({
        postId: publishedPost.id,
        userId: admin.id,
        commentId: adminComment.id,
        content: NEW_CONTENT,
      });
      expect(mockCommentsRepository.update).toHaveBeenCalledTimes(1);
      const res = await commentsService.getById({
        postId: publishedPost.id,
        commentId: adminComment.id,
      });
      expect(res.comment.content).toBe(NEW_CONTENT);
    });

    it(`should throw when the userId provided is not the 
      author of the comment , ADMIN or MOD `, async () => {
      expect.assertions(1);
      return commentsService
        .update({
          commentId: adminComment.id,
          userId: author.id,
          postId: publishedPost.id,
          content: NEW_CONTENT,
        })
        .catch((error) => {
          expect(error.message).toMatch(
            ERROR_MESSAGES[ERROR_CODES.SERVER.FORBIDDEN]
          );
        });
    });

    test.each(['ADMIN', 'MOD'])(
      'should not throw when the userId is either MOD or ADMIN',
      async (role) => {
        const user = [admin, mod].find((u) => u.role === role);
        if (!user) throw new Error('Missing test user');

        await commentsService.update({
          commentId: userComment.id,
          postId: publishedPost.id,
          userId: user.id,
          content: NEW_CONTENT,
        });
        expect(mockCommentsRepository.update).toHaveBeenCalledTimes(1);
      }
    );

    it('should throw when the commentId provided does not exist', async () => {
      expect.assertions(1);
      return commentsService
        .update({
          commentId: 999,
          userId: admin.id,
          postId: publishedPost.id,
          content: NEW_CONTENT,
        })
        .catch((error) => {
          expect(error.message).toMatch(
            ERROR_MESSAGES[ERROR_CODES.SERVER.NOT_FOUND]
          );
        });
    });

    it(`should throw when the comment for update is on a unpublished post
      and the user is not ADMIN, MOD or the author of the post`, async () => {
      await mockCommentsRepository.update(userComment.id, {
        postId: draftAuthorPost.id,
      });
      expect.assertions(1);
      return commentsService
        .update({
          commentId: userComment.id,
          userId: user.id,
          postId: draftAuthorPost.id,
          content: 'New Content',
        })
        .catch((error) => {
          expect(error.message).toMatch(
            ERROR_MESSAGES[ERROR_CODES.SERVER.FORBIDDEN]
          );
        });
    });
  });
});
