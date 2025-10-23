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

describe('comments service', () => {
  let user: User;
  let admin: User;
  let publishedPost: Post;
  let draftPost: Post;
  let membersOnlyPost: Post;

  const validPostContent = {
    content: 'Very valid description',
    createdAt: new Date(),
    publishedAt: null,
    updatedAt: new Date(),
  };

  const validCommentContent = {
    content: 'Very valid comment',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    await client.user.deleteMany();

    mockUsersRepo = new MockUserRepository();
    mockPostsRepo = new MockPostRepository();
    mockCommentsRepository = new MockCommentsRepository();

    user = await mockUsersRepo.create({
      email: 'fakeUser123@gmail.com',
      password: 'aldjfalsjdflsdjflkj',
      username: 'fakeUser123',
      role: 'USER',
    });

    admin = await mockUsersRepo.create({
      email: 'fakeAdmin123@gmail.com',
      password: 'aldjfalsjdflsdjflkj',
      username: 'fakeAdmin123',
      role: 'ADMIN',
    });

    publishedPost = await mockPostsRepo.create({
      ...validPostContent,
      title: 'PUBLISHED POST: 1',
      authorId: admin.id,
      status: 'PUBLISHED',
      visibility: 'PUBLIC',
    });

    membersOnlyPost = await mockPostsRepo.create({
      ...validPostContent,
      title: 'MEMBERS-ONLY POST: 1',
      authorId: admin.id,
      status: 'PUBLISHED',
      visibility: 'MEMBERS_ONLY',
    });

    draftPost = await mockPostsRepo.create({
      ...validPostContent,
      title: 'DRAFT: 1',
      authorId: user.id,
      status: 'DRAFT',
      visibility: 'PUBLIC',
    });

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
    const NUM_OF_USER_COMMENTS = 15;

    const PUBLISHED_POST_COMMENTS_COUNT =
      NUM_OF_ADMIN_COMMENTS + NUM_OF_USER_COMMENTS;
    const NUM_OF_MEMBER_ONLY_COMMENTS = 10;

    beforeEach(async () => {
      await mockCommentsRepository.deleteMany({});

      for (let i = 0; i < NUM_OF_ADMIN_COMMENTS; i++)
        await mockCommentsRepository.create({
          ...validCommentContent,
          content: `Admin Comment ${i}`,
          depth: 0,
          userId: admin.id,
          postId: publishedPost.id,
          threadParentId: null,
          createdAt: new Date(
            Date.now() + i * 1000 * 60 * 3 // 3 minutes between
          ),
        });

      for (let i = 0; i < NUM_OF_USER_COMMENTS; i++)
        await mockCommentsRepository.create({
          ...validCommentContent,
          content: `User Comment ${i}`,
          depth: 0,
          userId: user.id,
          postId: publishedPost.id,
          threadParentId: null,
          createdAt: new Date(
            Date.now() + i * 1000 * 60 * 3 // 3 minutes between
          ),
        });

      for (let i = 0; i < NUM_OF_MEMBER_ONLY_COMMENTS; i++)
        await mockCommentsRepository.create({
          ...validCommentContent,
          content: `MEMBER-ONLY Comment ${i}`,
          depth: 0,
          userId: admin.id,
          postId: membersOnlyPost.id,
          threadParentId: null,
          createdAt: new Date(
            Date.now() + i * 1000 * 60 * 3 // 3 minutes between
          ),
        });
    });

    it(`should return post comments and pagination metatdata, 
      with comments ordered by posted date (DESC)`, async () => {
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

    it('should include replies to comments in pagination.total field', async () => {
      const comment = await mockCommentsRepository.create({
        ...validCommentContent,
        postId: publishedPost.id,
        userId: admin.id,
        depth: 0,
        threadParentId: null,
      });
      await mockCommentsRepository.create({
        ...validCommentContent,
        postId: publishedPost.id,
        userId: admin.id,
        depth: 0,
        threadParentId: comment.id,
      });
      const res = await commentsService.getPostComments({
        postId: publishedPost.id,
        viewerId: admin.id,
      });

      expect(res.pagination.total).toBe(PUBLISHED_POST_COMMENTS_COUNT + 2);
    });

    test.each([
      ['created date (ASC)', getKey<Comment>('createdAt'), false],
      ['created date (DESC)', getKey<Comment>('createdAt'), true],
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
      ['negative page size', -1, 0],
      ['negative offset', 10, -1],
      ['floating point page size', 0.1, 0],
      ['floating point offset', 10, 2.5],
      ['string as page size', '0', 0],
      ['string as offset', 10, '0'],
      ['page size that is not allowed', 99, 0],
    ])('should throw when %s is set', async (_, pageSize, pageOffset) => {
      expect.assertions(1);
      // eslint-disable-next-line
      // @ts-ignore
      // prettier-ignore
      return commentsService.getPostComments({postId: publishedPost.id,viewerId: admin.id,pageSize,pageOffset,})
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
      'should throw when pagination offset (%s) is not devisable by page size (%s)',
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
      'should return page #%s when [ offset: %s ; pageLimit %s ]',
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

    it(`should throw when post with that id exist, but it's status is not PUBLISHED`, async () => {
      expect.assertions(1);
      return commentsService
        .getPostComments({
          postId: draftPost.id,
        })
        .catch((error) => {
          expect(error.message).toMatch(
            ERROR_MESSAGES[ERROR_CODES.SERVER.FORBIDDEN]
          );
        });
    });

    it(`should throw when post is MEMBERS-ONLY, and not userId is provided`, async () => {
      expect.assertions(1);
      return commentsService
        .getPostComments({
          postId: membersOnlyPost.id,
        })
        .catch((error) => {
          expect(error.message).toMatch(
            ERROR_MESSAGES[ERROR_CODES.SERVER.FORBIDDEN]
          );
        });
    });

    it(`should return comments for MEMBERS-ONLY post if viewer Id is provided`, async () => {
      const res = await commentsService.getPostComments({
        postId: membersOnlyPost.id,
        viewerId: admin.id,
      });

      expect(res.count).toBe(PAGINATION.COMMENTS.DEFAULT_ITEMS_PER_PAGE);
      expect(res.pagination.total).toBe(NUM_OF_MEMBER_ONLY_COMMENTS);
    });
  });

  describe('getCommentReplies()', () => {
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
      when post is published and not members-only`, async () => {
      const res = await commentsService.getCommentReplies({
        commentId: comment.id,
        postId: publishedPost.id,
      });
      expect(res.comment.content).toBe(COMMENT_CONTENT);
    });

    it('should retrieve comment replies and reply count', async () => {
      // First reply
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
        .getCommentReplies({
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
        .getCommentReplies({
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
        .getCommentReplies({
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
        .getCommentReplies({
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

    it(`should throw when post with that id exist, but it's status is not PUBLISHED`, async () => {
      const comment = await mockCommentsRepository.create({
        ...validCommentContent,
        postId: draftPost.id,
        userId: admin.id,
        depth: 0,
        threadParentId: null,
      });

      expect.assertions(1);
      return commentsService
        .getCommentReplies({
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

    it(`should throw when post is MEMBERS-ONLY, and not userId is provided`, async () => {
      const comment = await mockCommentsRepository.create({
        ...validCommentContent,
        postId: membersOnlyPost.id,
        userId: admin.id,
        depth: 0,
        threadParentId: null,
      });

      expect.assertions(1);
      return commentsService
        .getCommentReplies({
          commentId: comment.id,
          postId: comment.postId,
        })
        .catch((error) => {
          expect(error.message).toMatch(
            ERROR_MESSAGES[ERROR_CODES.SERVER.FORBIDDEN]
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
        userId: user.id,
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

    it(`should throw when post with that id exist but it's status is not PUBLISHED`, async () => {
      expect.assertions(1);
      return commentsService
        .create({
          ...validCommentContent,
          userId: admin.id,
          postId: draftPost.id,
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
    let comment: Comment;

    beforeEach(async () => {
      await mockCommentsRepository.deleteMany({});

      comment = await mockCommentsRepository.create({
        ...validCommentContent,
        postId: publishedPost.id,
        userId: admin.id,
        depth: 0,
        threadParentId: null,
      });
    });

    it('should delete comment on valid delete comment data provided', async () => {
      await commentsService.delete({
        postId: publishedPost.id,
        authorId: admin.id,
        commentId: comment.id,
      });
      expect(mockCommentsRepository.delete).toHaveBeenCalledTimes(1);
      const postComments = await commentsService.getPostComments({
        postId: publishedPost.id,
      });
      expect(postComments.count).toBe(0);
    });

    it('should throw when the authorId provided is not the author of the comment', async () => {
      expect.assertions(1);
      return commentsService
        .delete({
          commentId: comment.id,
          authorId: user.id,
          postId: publishedPost.id,
        })
        .catch((error) => {
          expect(error.message).toMatch(
            ERROR_MESSAGES[ERROR_CODES.SERVER.FORBIDDEN]
          );
        });
    });

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

    it('should throw when the comment for deletion is on a unpublished post', async () => {
      await mockCommentsRepository.update(comment.id, {
        postId: draftPost.id,
      });
      expect.assertions(1);
      return commentsService
        .delete({
          commentId: comment.id,
          authorId: admin.id,
          postId: draftPost.id,
        })
        .catch((error) => {
          expect(error.message).toMatch(
            ERROR_MESSAGES[ERROR_CODES.SERVER.FORBIDDEN]
          );
        });
    });

    it('should also remove all related replies spanning from that comment thread', async () => {
      // First reply
      const replyAtDepth_1 = await mockCommentsRepository.create({
        ...validCommentContent,
        content: 'Comment at depth 1',
        depth: 1,
        userId: comment.userId,
        postId: comment.postId,
        threadParentId: comment.id,
      });

      // Reply to the replyAtDepth_1
      await mockCommentsRepository.create({
        ...validCommentContent,
        content: 'Comment at depth 2',
        depth: 2,
        userId: comment.userId,
        postId: comment.postId,
        threadParentId: replyAtDepth_1.id,
      });

      await commentsService.delete({
        postId: publishedPost.id,
        authorId: admin.id,
        commentId: comment.id,
      });
      expect(mockCommentsRepository.delete).toHaveBeenCalledTimes(1);
      const postComments = await commentsService.getPostComments({
        postId: publishedPost.id,
      });
      expect(postComments.count).toBe(0);
    });
  });

  describe('update()', () => {
    let comment: Comment;

    const NEW_CONTENT = 'New content YUpee';
    beforeEach(async () => {
      await mockCommentsRepository.deleteMany({});

      comment = await mockCommentsRepository.create({
        ...validCommentContent,
        postId: publishedPost.id,
        userId: admin.id,
        depth: 0,
        threadParentId: null,
      });
    });

    it('should update comment on valid update comment data provided', async () => {
      await commentsService.update({
        postId: publishedPost.id,
        userId: admin.id,
        commentId: comment.id,
        content: NEW_CONTENT,
      });
      expect(mockCommentsRepository.update).toHaveBeenCalledTimes(1);
      const res = await commentsService.getCommentReplies({
        postId: publishedPost.id,
        commentId: comment.id,
      });
      expect(res.comment.content).toBe(NEW_CONTENT);
    });

    it('should throw when the userId provided is not the author of the comment', async () => {
      expect.assertions(1);
      return commentsService
        .update({
          commentId: comment.id,
          userId: user.id,
          postId: publishedPost.id,
          content: NEW_CONTENT,
        })
        .catch((error) => {
          expect(error.message).toMatch(
            ERROR_MESSAGES[ERROR_CODES.SERVER.FORBIDDEN]
          );
        });
    });

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

    it('should throw when the comment for update is on a unpublished post', async () => {
      await mockCommentsRepository.update(comment.id, {
        postId: draftPost.id,
      });
      expect.assertions(1);
      return commentsService
        .update({
          commentId: comment.id,
          userId: admin.id,
          postId: draftPost.id,
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
