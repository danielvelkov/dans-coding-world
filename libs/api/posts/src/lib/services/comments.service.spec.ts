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
import { generateRandomString, getKey } from '@dans-coding-world/helpers';

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

    describe('Nested comment replies', () => {
      let postWithDeeplyNestedReplies: Post;
      const NUM_OF_TOP_LEVEL_COMMENTS = 5;

      let repliesToTopLevelComments: Comment[];

      beforeEach(async () => {
        repliesToTopLevelComments = [];

        postWithDeeplyNestedReplies = await mockPostsRepo.create({
          ...validPostContent,
          authorId: author.id,
          status: 'PUBLISHED',
          visibility: 'PUBLIC',
        });

        for (let i = 0; i < NUM_OF_TOP_LEVEL_COMMENTS; i++) {
          const comment = await mockCommentsRepository.create({
            ...validCommentContent,
            depth: 0,
            postId: postWithDeeplyNestedReplies.id,
            userId: user.id,
            threadParentId: null,
          });
          const replies = await createNestedReplies(comment, 1);
          repliesToTopLevelComments = [
            ...repliesToTopLevelComments,
            ...replies,
          ];
        }
      });

      it(`should return all replies for each comment when maxReplyLevels is not set`, async () => {
        const res = await commentsService.getPostComments({
          postId: postWithDeeplyNestedReplies.id,
          viewerId: admin.id,
        });

        for (const comment of res.items)
          checkRepliesRecursively(comment.replies, repliesToTopLevelComments);
      });

      it(`should return the expected amount of replies when param maxReplyLevels is set`, async () => {
        for (
          let replyLevel = 1;
          replyLevel <= COMMENT_CONSTRAINTS.MAX_REPLY_TREE_DEPTH;
          replyLevel++
        ) {
          const res = await commentsService.getPostComments({
            postId: postWithDeeplyNestedReplies.id,
            viewerId: admin.id,
            maxReplyLevels: replyLevel,
          });

          for (const comment of res.items)
            checkRepliesRecursively(
              comment.replies,
              // get only those comments up until that depth
              repliesToTopLevelComments.filter((c) => c.depth <= replyLevel)
            );
        }
      });

      it('should handle comments with no replies correctly when maxReplyLevels is set', async () => {
        const commentWithoutReplies = await mockCommentsRepository.create({
          ...validCommentContent,
          content: 'Lonely comment',
          depth: 0,
          postId: postWithDeeplyNestedReplies.id,
          userId: user.id,
          threadParentId: null,
        });

        for (
          let depthLevel = 1;
          depthLevel <= COMMENT_CONSTRAINTS.MAX_REPLY_TREE_DEPTH;
          depthLevel++
        ) {
          const res = await commentsService.getPostComments({
            postId: postWithDeeplyNestedReplies.id,
            viewerId: admin.id,
            maxReplyLevels: depthLevel,
          });

          const lonelyComment = res.items.find(
            (c) => c.id === commentWithoutReplies.id
          );
          expect(lonelyComment?.replies).toEqual([]);
          expect(lonelyComment?.replyCount).toBe(0);
        }
      });

      test.each([
        ['is not a number', 'a'],
        ['is a decimal', 1.5],
        ['is array', []],
        ['is a non numeric string', 'a1'],
        [
          'is smaller than minimum',
          COMMENT_CONSTRAINTS.MIN_REPLY_TREE_DEPTH - 1,
        ],
        [
          'is bigger than set maximum',
          COMMENT_CONSTRAINTS.MAX_REPLY_TREE_DEPTH + 1,
        ],
      ])(
        'should throw validation error when maxReplyLevels param %s',
        async (_, depth) => {
          expect.assertions(1);
          return commentsService
            .getPostComments({
              viewerId: admin.id,
              postId: publishedPost.id,
              maxReplyLevels: depth as any,
            })
            .catch((error) => {
              expect(error.message).toMatch(/failed.*validation/i);
            });
        }
      );
    });

    test.each([
      ['created date (DESC)', getKey<Comment>('createdAt'), true],
      ['created date (ASC)', getKey<Comment>('createdAt'), false],
      ['updated date (DESC)', getKey<Comment>('updatedAt'), true],
      ['updated date (ASC)', getKey<Comment>('updatedAt'), false],
    ])(
      'should sort comments provided that sorting by %s is applied',
      async (_, propName, descendingOrder: boolean) => {
        const res = await commentsService.getPostComments({
          sortBy: {
            [propName]: descendingOrder ? 'desc' : 'asc',
          },
          postId: publishedPost.id,
        });

        const sortedItems = [...res.items].sort((prev, next) => {
          if (!prev[propName] || !next[propName]) return 0;
          const prevDate = (prev[propName] as Date).getTime();
          const nextDate = (next[propName] as Date).getTime();
          return descendingOrder ? nextDate - prevDate : prevDate - nextDate;
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

    describe('Nested comment replies', () => {
      let repliesToComment: Comment[];

      beforeEach(async () => {
        repliesToComment = await createNestedReplies(comment, 1);
      });

      it(`should return all the comment's replies when maxReplyLevels is not set`, async () => {
        const res = await commentsService.getById({
          commentId: comment.id,
          postId: comment.postId,
          viewerId: admin.id,
        });

        for (const comment of res.comment.replies)
          checkRepliesRecursively(comment.replies, repliesToComment);
      });

      it(`should return the expected amount of replies when maxReplyLevels is set`, async () => {
        for (
          let replyLevel = 1;
          replyLevel <= COMMENT_CONSTRAINTS.MAX_REPLY_TREE_DEPTH;
          replyLevel++
        ) {
          const res = await commentsService.getById({
            commentId: comment.id,
            postId: comment.postId,
            viewerId: admin.id,
            maxReplyLevels: replyLevel,
          });

          for (const comment of res.comment.replies)
            checkRepliesRecursively(
              comment.replies,
              repliesToComment.filter((c) => c.depth <= replyLevel)
            );
        }
      });

      it('should handle a comment with no replies correctly when maxReplyLevels is set', async () => {
        const commentWithoutReplies = await mockCommentsRepository.create({
          ...validCommentContent,
          content: 'Lonely comment',
          depth: 0,
          postId: publishedPost.id,
          userId: user.id,
          threadParentId: null,
        });

        for (
          let depthLevel = 1;
          depthLevel <= COMMENT_CONSTRAINTS.MAX_REPLY_TREE_DEPTH;
          depthLevel++
        ) {
          const res = await commentsService.getById({
            commentId: commentWithoutReplies.id,
            postId: commentWithoutReplies.postId,
            viewerId: admin.id,
            maxReplyLevels: depthLevel,
          });

          expect(res?.comment.replies).toEqual([]);
          expect(res.comment.replyCount).toBe(0);
        }
      });

      test.each([
        ['is not a number', 'a'],
        ['is a decimal', 1.5],
        ['is array', []],
        ['is a non numeric string', 'a1'],
        [
          'is smaller than minimum',
          COMMENT_CONSTRAINTS.MIN_REPLY_TREE_DEPTH - 1,
        ],
        [
          'is bigger than set maximum',
          COMMENT_CONSTRAINTS.MAX_REPLY_TREE_DEPTH + 1,
        ],
      ])(
        'should throw validation error when maxReplyLevels param %s',
        async (_, depth) => {
          expect.assertions(1);
          return commentsService
            .getById({
              commentId: comment.id,
              viewerId: admin.id,
              postId: comment.postId,
              maxReplyLevels: depth as any,
            })
            .catch((error) => {
              expect(error.message).toMatch(/failed.*validation/i);
            });
        }
      );
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

    it(`should throw when tree depth of comment replies go over
       ${COMMENT_CONSTRAINTS.MAX_REPLY_TREE_DEPTH} levels deep`, async () => {
      const postComment = await commentsService.create({
        ...validCommentContent,
        userId: admin.id,
        postId: publishedPost.id,
      });
      let parentId = postComment.id;

      for (
        let depth = 0;
        depth <= COMMENT_CONSTRAINTS.MAX_REPLY_TREE_DEPTH;
        depth++
      ) {
        if (depth === COMMENT_CONSTRAINTS.MAX_REPLY_TREE_DEPTH) {
          await expect(
            commentsService.create({
              content: 'I agree',
              userId: admin.id,
              postId: publishedPost.id,
              replyToCommentId: parentId,
            })
          ).rejects.toHaveProperty(
            'message',
            ERROR_MESSAGES[ERROR_CODES.VALIDATION.MAX_REPLY_DEPTH_REACHED]
          );
        } else {
          const commentReply = await commentsService.create({
            content: 'I agree',
            userId: admin.id,
            postId: publishedPost.id,
            replyToCommentId: parentId,
          });

          parentId = commentReply.id;
          expect(commentReply.depth).toBe(depth + 1);
        }
      }
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

  /**
   * Creates deeply nested random amount of replies for a given comment.
   * @param parentComment Parent comment which will contain all replies
   * @param currentDepth At what depth the parent comment is
   * @returns Replies array
   */
  async function createNestedReplies(
    parentComment: Comment,
    currentDepth = 1
  ): Promise<Comment[]> {
    if (currentDepth > COMMENT_CONSTRAINTS.MAX_REPLY_TREE_DEPTH) {
      return [];
    }

    const replies: Comment[] = [];
    const randomNumOfReplies = Math.floor(Math.random() * 4 + 1);

    for (let i = 0; i < randomNumOfReplies; i++) {
      const reply = await mockCommentsRepository.create({
        ...validCommentContent,
        depth: currentDepth,
        userId: admin.id,
        postId: parentComment.id,
        threadParentId: parentComment.id,
      });

      replies.push(reply);

      const nestedReplies = await createNestedReplies(reply, currentDepth + 1);
      replies.push(...nestedReplies);
    }

    return replies;
  }

  function checkRepliesRecursively(
    commentsToCheck: CommentWithReplies[],
    allComments: Comment[]
  ) {
    for (const comment of commentsToCheck) {
      if (comment.replies) {
        const expectedReplies = allComments.filter(
          (p) => p.threadParentId === comment.id
        );
        expect(comment.replies.length).toBe(expectedReplies.length);
        expect(comment.replyCount).toBe(getReplyCountRecursively(comment));

        expect(
          comment.replies.every((c) =>
            expectedReplies.map((r) => r.id).includes(c.id)
          )
        ).toBe(true);

        for (const reply of comment.replies)
          checkRepliesRecursively(reply.replies, allComments);
      }
    }
  }

  function getReplyCountRecursively(comment: CommentWithReplies) {
    let sum = 0;
    comment.replies?.forEach((c) => {
      sum++;
      if (c.replies) sum += getReplyCountRecursively(c);
    });
    return sum;
  }
});
