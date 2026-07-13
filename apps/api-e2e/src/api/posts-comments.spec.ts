/* eslint-disable @typescript-eslint/no-explicit-any */
import { client as prisma } from '@dans-coding-world/prisma-schema';
import type {
  Comment,
  CommentWithReplies,
  Post,
  User,
} from '@dans-coding-world/prisma-schema';
import {
  seedUsers,
  seedPosts,
  seedComments,
} from '@dans-coding-world/api-tools';
import {
  COMMENT_CONSTRAINTS,
  ERROR_CODES,
  PAGINATION,
  SUCCESS_MESSAGES,
} from '@dans-coding-world/shared-constants';
import { createPostsRouteHelper } from '../helper/posts-request.helper';
import {
  GetCommentResponseDto,
  GetPostCommentsResponseDto,
} from '@dans-coding-world/shared-post-dto';
import { createErrorCodeResponse } from '../helper/error-response.helper';
import { passwordGenerator as generateRandomString } from '@dans-coding-world/helpers';
import { testInvalidIds } from '../helper/test-cases.helper';
import { getData, getMessage } from '../helper/common.helper';
import { setupClient } from '../helper/test-client.helper';

describe('/api/v1/posts/{postId}/comments', () => {
  let users: User[] = [];
  let posts: Post[] = [];
  let comments: Comment[] = [];

  let admin: User;
  let mod: User;
  let user: User;
  let author: User;

  let publishedPublicPosts: Post[];
  let draftPosts: Post[];
  let archivedPosts: Post[];
  let membersOnlyPosts: Post[];

  type PostHelpers = ReturnType<typeof createPostsRouteHelper>;

  let adminHelpers: PostHelpers;
  let userHelpers: PostHelpers;
  let authorHelpers: PostHelpers;
  let modHelpers: PostHelpers;
  let anonHelpers: PostHelpers; // For unauthenticated requests

  beforeAll(async () => {
    users = await seedUsers();
    posts = await seedPosts();
    comments = await seedComments();

    publishedPublicPosts = posts.filter(
      (p) => p.visibility === 'PUBLIC' && p.status === 'PUBLISHED',
    );
    draftPosts = posts.filter((p) => p.status === 'DRAFT');
    archivedPosts = posts.filter((p) => p.status === 'ARCHIVED');
    membersOnlyPosts = posts.filter(
      (p) => p.visibility === 'MEMBERS_ONLY' && p.status === 'PUBLISHED',
    );

    if (!publishedPublicPosts || !draftPosts || !membersOnlyPosts)
      throw new Error('Missing posts');

    admin = users.find((u) => u.role === 'ADMIN') as any;
    author = users.find((u) => u.role === 'AUTHOR') as any;
    mod = users.find((u) => u.role === 'MOD') as any;
    user = users.find((u) => u.role === 'USER') as any;

    if (!admin || !author || !mod || !user) throw new Error('Missing users');

    [adminHelpers, userHelpers, authorHelpers, modHelpers, anonHelpers] =
      await Promise.all([
        setupClient(createPostsRouteHelper, admin),
        setupClient(createPostsRouteHelper, user),
        setupClient(createPostsRouteHelper, author),
        setupClient(createPostsRouteHelper, mod),
        setupClient(createPostsRouteHelper, undefined),
      ]);
  });

  describe('GET /api/v1/posts/{postId}/comments', () => {
    it(`should return top-level comments for PUBLIC and PUBLISHED posts
      including each comment's replies count`, async () => {
      const publishedPosts = posts.filter(
        (p) => p.status === 'PUBLISHED' && p.visibility === 'PUBLIC',
      );
      if (!publishedPosts) throw new Error('Missing published test posts');

      for (const post of publishedPosts) {
        const res = await anonHelpers.getPostComments(post.id.toString());

        expect(getMessage(res)).toBe(
          SUCCESS_MESSAGES.COMMENTS.getPostsComments,
        );

        const commentsData = getData<GetPostCommentsResponseDto>(res);
        const postComments = commentsData.items;

        // Total should show only direct replies to post (depth === 0)
        expect(commentsData.pagination.total).toBe(
          comments.filter((c) => c.postId === post.id && c.depth === 0).length,
        );
        expect(commentsData.pagination.limit).toBe(
          PAGINATION.COMMENTS.DEFAULT_ITEMS_PER_PAGE,
        );

        for (const comment of postComments) {
          expect(comment.postId).toBe(post.id);
          const expectedComment = comments.find((c) => c.id === comment.id);

          expect(expectedComment?.content).toBe(comment.content);

          expect(comment.replyCount).toBe(getReplyCountRecursively(comment));
        }
      }
    });

    testInvalidIds((id) => anonHelpers.getPostComments(id), 'postId');

    it.concurrent(
      'should return 404 NOT FOUND for unknown post id',
      async () => {
        return await expect(
          anonHelpers.getPostComments('9999'),
        ).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.SERVER.NOT_FOUND),
        );
      },
    );

    describe('?depth=y', () => {
      let postWithDeeplyNestedReplies: Post;

      beforeEach(async () => {
        const commentAtDepth_3 = comments.find((c) => c.depth === 3);
        const post = posts.find((p) => p.id === commentAtDepth_3?.postId);
        if (!post) throw new Error('Missing post with deeply nested replies');

        postWithDeeplyNestedReplies = post;
      });

      it(`should return all replies for each comment when depth is omitted from query`, async () => {
        const res = await adminHelpers.getPostComments(
          postWithDeeplyNestedReplies.id.toString(),
        );

        const commentsData = getData<GetPostCommentsResponseDto>(res);

        for (const comment of commentsData.items)
          checkRepliesRecursively(
            comment.replies,
            comments.filter((c) => c.postId === postWithDeeplyNestedReplies.id),
          );
      });

      it(`should return the expected amount of replies when depth is set`, async () => {
        for (
          let replyLevel = 1;
          replyLevel <= COMMENT_CONSTRAINTS.MAX_REPLY_TREE_DEPTH;
          replyLevel++
        ) {
          const res = await adminHelpers.getPostComments(
            postWithDeeplyNestedReplies.id.toString(),
            {
              depth: replyLevel,
            },
          );

          const commentsData = getData<GetPostCommentsResponseDto>(res);

          for (const comment of commentsData.items)
            checkRepliesRecursively(
              comment.replies,
              comments.filter(
                (c) =>
                  c.postId === postWithDeeplyNestedReplies.id &&
                  c.depth <= replyLevel,
              ),
            );
        }
      });

      it('should return comments with no replies correctly for any depth', async () => {
        const commentWithoutReplies = comments.find(
          (c, _, arr) =>
            !arr.map((com) => com.threadParentId).includes(c.id) &&
            c.depth === 0,
        );
        if (!commentWithoutReplies) throw new Error('Missing test comment');

        for (
          let depthLevel = 1;
          depthLevel <= COMMENT_CONSTRAINTS.MAX_REPLY_TREE_DEPTH;
          depthLevel++
        ) {
          const res = await adminHelpers.getPostComments(
            commentWithoutReplies?.postId.toString(),
            {
              maxReplyLevels: depthLevel,
            },
          );

          const commentsData = getData<GetPostCommentsResponseDto>(res);

          const lonelyComment = commentsData.items.find(
            (c) => c.id === commentWithoutReplies.id,
          );
          expect(lonelyComment?.replies).toEqual([]);
          expect(lonelyComment?.replyCount).toBe(0);
        }
      });

      test.concurrent.each([
        ['is not a number', 'a'],
        ['is a decimal', 1.5],
        ['is a non numeric string', 'a1'],
        [
          'is smaller than minimum',
          COMMENT_CONSTRAINTS.MIN_REPLY_TREE_DEPTH - 1,
        ],
        [
          'is bigger than set maximum',
          COMMENT_CONSTRAINTS.MAX_REPLY_TREE_DEPTH + 1,
        ],
      ])('should return validation error when depth %s', async (_, depth) => {
        return await expect(
          anonHelpers.getPostComments(publishedPublicPosts[0].id.toString(), {
            depth,
          }),
        ).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.VALIDATION.VALIDATION_ERROR),
        );
      });
    });

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
            anonHelpers.getPostComments(publishedPublicPosts[0].id.toString(), {
              sortBy: {
                [key]: value,
              },
            }),
          ).rejects.toMatchObject(
            createErrorCodeResponse(ERROR_CODES.VALIDATION.VALIDATION_ERROR),
          );
        },
      );

      test.concurrent.each([
        ['created date (ASC)', 'createdAt', false],
        ['created date (DESC)', 'createdAt', true],
        ['updated date (ASC)', 'updatedAt', false],
        ['updated date (DESC)', 'updatedAt', true],
      ])(
        'should sort items provided that sorting by %s is applied',
        async (_, propName, isDescending: boolean) => {
          const res = await anonHelpers.getPostComments(
            publishedPublicPosts[0].id.toString(),
            {
              sortBy: {
                [propName]: isDescending ? 'desc' : 'asc',
              },
            },
          );

          const commentsData = getData<GetPostCommentsResponseDto>(res);

          const sortedItems = [...commentsData.items].sort((prev, next) => {
            if (!prev[propName] || !next[propName]) return 0;
            const prevDate = new Date(prev[propName]).getTime();
            const nextDate = new Date(next[propName]).getTime();
            return isDescending ? nextDate - prevDate : prevDate - nextDate;
          });

          sortedItems.forEach((comment, i) => {
            expect(comment.id).toBe(commentsData.items[i].id);
          });
        },
      );
    });

    describe('?pageOffset=x&pageSize=y', () => {
      let postWithoutCommentsId: number;

      const totalNumberOfComments = 150;
      const pageSizeOptions = PAGINATION.COMMENTS.ITEMS_PER_PAGE_OPTIONS;
      const defaultPageSize = PAGINATION.COMMENTS.DEFAULT_ITEMS_PER_PAGE;

      beforeAll(async () => {
        const postWithoutComments = posts.find(
          (p) =>
            !comments.find((c) => c.postId === p.id) &&
            p.status === 'PUBLISHED' &&
            p.visibility === 'PUBLIC',
        );
        if (!postWithoutComments)
          throw new Error('Missing test post without comments');

        postWithoutCommentsId = postWithoutComments.id;

        const customComments = Array.from({
          length: totalNumberOfComments,
        }).map((_, i) => {
          return {
            postId: postWithoutCommentsId,
            content: `Comment number #${i}`,
            userId: admin.id,
            depth: 0,
          } as Comment;
        });
        comments = await seedComments(customComments, {
          clearExisting: true,
          useDefaults: false,
        });
      });

      afterAll(async () => {
        comments = await seedComments();
      });

      it(`should return the default items per page (${defaultPageSize})
       when pageSize is not defined`, async () => {
        const offset = defaultPageSize * 2;
        const res = await anonHelpers.getPostComments(
          postWithoutCommentsId.toString(),
          {
            pageOffset: offset,
          },
        );

        const commentsData = getData<GetPostCommentsResponseDto>(res);

        expect(commentsData.count).toBe(defaultPageSize);
        expect(commentsData.items.length).toBe(defaultPageSize);
        expect(commentsData.pagination.page).toBe(offset / defaultPageSize + 1);
      });

      it('should return 0 items when offset is beyond total number of comments', async () => {
        const res = await anonHelpers.getPostComments(
          postWithoutCommentsId.toString(),
          {
            pageOffset: totalNumberOfComments,
            pageSize: pageSizeOptions[2],
          },
        );

        const commentsData = getData<GetPostCommentsResponseDto>(res);

        expect(commentsData.pagination.page).toBe(
          Math.ceil(totalNumberOfComments / pageSizeOptions[2]) + 1,
        );
        expect(commentsData.count).toBe(0);
        expect(commentsData.items.length).toBe(0);
      });

      test.each([
        [1, 0, pageSizeOptions[0]],
        [2, pageSizeOptions[0], pageSizeOptions[0]],
        [3, pageSizeOptions[0] * 2, pageSizeOptions[0]],
        [2, pageSizeOptions[1], pageSizeOptions[1]],
        [5, pageSizeOptions[1] * 4, pageSizeOptions[1]],
        [
          Math.ceil(totalNumberOfComments / pageSizeOptions[0]) + 1,
          totalNumberOfComments,
          pageSizeOptions[0],
        ],
      ])(
        'should return page #%s when [ offset: %s ; pageLimit %s ]',
        async (expectedPageNum, pageOffset, pageSize) => {
          const res = await anonHelpers.getPostComments(
            postWithoutCommentsId.toString(),
            {
              pageOffset,
              pageSize,
            },
          );

          const commentsData = getData<GetPostCommentsResponseDto>(res);

          expect(commentsData.pagination.page).toBe(expectedPageNum);
          expect(commentsData.pagination.total).toBe(totalNumberOfComments);
        },
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
      ])('should return validation error when %s', async (_, params) => {
        await expect(
          anonHelpers.getPostComments(postWithoutCommentsId.toString(), params),
        ).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.VALIDATION.VALIDATION_ERROR),
        );
      });
    });

    describe('Guest User (Not Authenticated)', () => {
      beforeAll(async () => {
        comments = await seedComments();
      });

      it(`should return 401 UNAUTHORIZED when trying to get comments from a
        MEMBERS_ONLY post`, async () => {
        for (const post of membersOnlyPosts)
          await expect(
            anonHelpers.getPostComments(post.id.toString()),
          ).rejects.toMatchObject(
            createErrorCodeResponse(ERROR_CODES.AUTH.UNAUTHORIZED),
          );
      });

      it(`should return 403 FORBIDDEN when trying to get comments from a
        DRAFT or ARCHIVED post`, async () => {
        for (const post of draftPosts.concat(archivedPosts))
          await expect(
            anonHelpers.getPostComments(post.id.toString()),
          ).rejects.toMatchObject(
            createErrorCodeResponse(ERROR_CODES.SERVER.FORBIDDEN),
          );
      });
    });

    describe('Authenticated user', () => {
      it('should return comments for a MEMBERS-ONLY post when logged in', async () => {
        const membersOnlyPost = posts.find(
          (p) =>
            p.visibility === 'MEMBERS_ONLY' &&
            p.status === 'PUBLISHED' &&
            comments.find((c) => c.postId === p.id),
        );
        if (!membersOnlyPost) throw new Error('Missing test post');

        const expectedNumberOfComments = comments.filter(
          (c) => c.postId === membersOnlyPost.id && c.depth === 0,
        ).length;

        const res = await authorHelpers.getPostComments(
          membersOnlyPost.id.toString(),
        );

        const commentsData = getData<GetPostCommentsResponseDto>(res);

        expect(commentsData.pagination.total).toBe(expectedNumberOfComments);
      });

      it(`should return comments for a logged-in user's DRAFT or ARCHIVED post`, async () => {
        const archivedPost = posts.find(
          (p) =>
            p.status === 'ARCHIVED' &&
            p.authorId === admin.id &&
            comments.find((c) => c.postId === p.id),
        );
        const draftPost = posts.find(
          (p) =>
            p.status === 'DRAFT' &&
            p.authorId === admin.id &&
            comments.find((c) => c.postId === p.id),
        );
        if (!archivedPost || !draftPost) throw new Error('Missing test posts');

        for (const post of [archivedPost, draftPost]) {
          const expectedNumberOfComments = comments.filter(
            (c) => c.postId === post.id && c.depth === 0,
          ).length;
          const res = await adminHelpers.getPostComments(post.id.toString());

          const commentsData = getData<GetPostCommentsResponseDto>(res);

          expect(commentsData.pagination.total).toBe(expectedNumberOfComments);
        }
      });

      it(`should return 403 FORBIDDEN when trying to get comments 
        for DRAFT or ARCHIVED post of another user`, async () => {
        const archivedPost = posts.find(
          (p) => p.status === 'ARCHIVED' && p.authorId !== author.id,
        );
        const draftPost = posts.find(
          (p) => p.status === 'DRAFT' && p.authorId !== author.id,
        );
        if (!archivedPost || !draftPost) throw new Error('Missing test posts');

        // Not logged in
        for (const id of [archivedPost.id, draftPost.id])
          await expect(
            anonHelpers.getPostComments(id.toString()),
          ).rejects.toMatchObject(
            createErrorCodeResponse(ERROR_CODES.SERVER.FORBIDDEN),
          );

        // Logged in as another user
        for (const id of [archivedPost.id, draftPost.id])
          await expect(
            authorHelpers.getPostComments(id.toString()),
          ).rejects.toMatchObject(
            createErrorCodeResponse(ERROR_CODES.SERVER.FORBIDDEN),
          );
      });
    });
  });

  describe('GET /api/v1/posts/{postId}/comments/{id}', () => {
    it(`should return top-level replies for a comment of a 
      PUBLIC and PUBLISHED post including replies count`, async () => {
      const publishedPosts = posts.filter(
        (p) =>
          p.status === 'PUBLISHED' &&
          p.visibility === 'PUBLIC' &&
          comments.find((c) => c.postId === p.id && c.threadParentId),
      );
      if (!publishedPosts) throw new Error('Missing published test posts');

      for (const post of publishedPosts) {
        const commentsWithReplies = comments.filter(
          (c, i, arr) =>
            c.postId === post.id &&
            arr.find((r) => r.threadParentId === c.id) &&
            c.depth === 0,
        );
        if (!commentsWithReplies.length)
          throw new Error('Missing replies for post');

        for (const comment of commentsWithReplies) {
          const res = await anonHelpers.getComment(
            post.id.toString(),
            comment.id.toString(),
          );

          expect(getMessage(res)).toBe(SUCCESS_MESSAGES.COMMENTS.get);

          const commentsData = getData<GetCommentResponseDto>(res);
          const replies = commentsData.comment.replies;

          expect(replies.every((c) => c.threadParentId === comment.id)).toBe(
            true,
          );

          expect(commentsData.comment.replyCount).toBe(
            getReplyCountRecursively(commentsData.comment),
          );
        }
      }
    });

    testInvalidIds((id) => anonHelpers.getComment(id, '1'), 'postId');
    testInvalidIds((id) => anonHelpers.getComment('1', id), 'commentId');

    it('should return 404 NOT FOUND for unknown post id or comment id', async () => {
      await expect(anonHelpers.getComment('999', '1')).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.NOT_FOUND),
      );

      const publishedPost = posts.find(
        (p) =>
          p.status === 'PUBLISHED' &&
          p.visibility === 'PUBLIC' &&
          comments.find((c) => c.postId === p.id),
      );

      if (!publishedPost) throw new Error('Missing published test post');

      await expect(
        anonHelpers.getComment(publishedPost.id.toString(), '9999'),
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.NOT_FOUND),
      );
    });

    describe('?depth=y', () => {
      let commentWithDeeplyNestedReplies: Comment;
      let commentReplies: Comment[];

      beforeEach(async () => {
        let searchedComment = comments.find((c) => c.depth === 3);
        if (!searchedComment) throw new Error('Missing deeply nested reply');

        for (
          let currDepth = searchedComment.depth;
          currDepth > 0;
          currDepth--
        ) {
          searchedComment = comments.find(
            (c) => c.id === searchedComment?.threadParentId,
          );
        }

        if (!searchedComment) throw new Error('Missing deeply nested reply');
        commentWithDeeplyNestedReplies = searchedComment;

        commentReplies = comments.filter(
          (c) => c.threadParentId === commentWithDeeplyNestedReplies.id,
        );

        for (
          let currDepth = 2;
          currDepth <= COMMENT_CONSTRAINTS.MAX_REPLY_TREE_DEPTH;
          currDepth++
        ) {
          const temp = comments.filter(
            (c) =>
              c.depth === currDepth &&
              c.threadParentId &&
              commentReplies.map((com) => com.id).includes(c.threadParentId),
          );
          commentReplies.push(...temp);
        }
      });

      it(`should return all the comment's replies when depth is not set`, async () => {
        const res = await anonHelpers.getComment(
          commentWithDeeplyNestedReplies.postId.toString(),
          commentWithDeeplyNestedReplies.id.toString(),
        );

        const commentsData = getData<GetCommentResponseDto>(res);
        const replies = commentsData.comment.replies;
        for (const comment of replies)
          checkRepliesRecursively(comment.replies, commentReplies);
      });

      it(`should return the expected amount of replies when depth is set`, async () => {
        for (
          let replyLevel = 1;
          replyLevel <= COMMENT_CONSTRAINTS.MAX_REPLY_TREE_DEPTH;
          replyLevel++
        ) {
          const res = await anonHelpers.getComment(
            commentWithDeeplyNestedReplies.postId.toString(),
            commentWithDeeplyNestedReplies.id.toString(),
            { depth: replyLevel },
          );

          const commentData = getData<GetCommentResponseDto>(res);

          for (const comment of commentData.comment.replies)
            checkRepliesRecursively(
              comment.replies,
              commentReplies.filter((c) => c.depth <= replyLevel),
            );
        }
      });

      test.concurrent.each([
        ['is not a number', 'a'],
        ['is a decimal', 1.5],
        ['is a non numeric string', 'a1'],
        [
          'is smaller than minimum',
          COMMENT_CONSTRAINTS.MIN_REPLY_TREE_DEPTH - 1,
        ],
        [
          'is bigger than set maximum',
          COMMENT_CONSTRAINTS.MAX_REPLY_TREE_DEPTH + 1,
        ],
      ])('should return validation error when depth %s', async (_, depth) => {
        return await expect(
          anonHelpers.getComment(
            commentWithDeeplyNestedReplies.postId.toString(),
            commentWithDeeplyNestedReplies.id.toString(),
            {
              depth,
            },
          ),
        ).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.VALIDATION.VALIDATION_ERROR),
        );
      });
    });

    describe('Guest User (Not Authenticated)', () => {
      it(`should return 401 UNAUTHORIZED when trying to get replies of a comment 
        from a MEMBERS_ONLY post`, async () => {
        for (const post of membersOnlyPosts)
          await expect(
            anonHelpers.getComment(post.id.toString(), '1'),
          ).rejects.toMatchObject(
            createErrorCodeResponse(ERROR_CODES.AUTH.UNAUTHORIZED),
          );
      });

      it(`should return 403 FORBIDDEN when trying to get replies of a comment
         from a DRAFT or ARCHIVED post`, async () => {
        for (const post of draftPosts.concat(archivedPosts))
          await expect(
            anonHelpers.getComment(post.id.toString(), '1'),
          ).rejects.toMatchObject(
            createErrorCodeResponse(ERROR_CODES.SERVER.FORBIDDEN),
          );
      });
    });

    describe('Authenticated user', () => {
      it(`should return comment and its replies for a MEMBERS-ONLY
         post when logged in`, async () => {
        const membersOnlyPosts = posts.filter(
          (p) =>
            p.visibility === 'MEMBERS_ONLY' &&
            p.status === 'PUBLISHED' &&
            comments.find((c) => c.postId === p.id && c.threadParentId) &&
            p.authorId !== author.id,
        );
        if (!membersOnlyPosts) throw new Error('Missing test posts');

        for (const post of membersOnlyPosts) {
          const postComments = comments.filter(
            (c) => c.postId === post.id && c.depth === 0,
          );

          for (const comment of postComments) {
            const expectedNumberOfComments = comments.filter(
              (c) => c.postId === post.id && c.threadParentId === comment.id,
            ).length;

            const res = await authorHelpers.getComment(
              post.id.toString(),
              comment.id.toString(),
            );

            const repliesData = getData<GetCommentResponseDto>(res);

            expect(repliesData.comment.replyCount).toBe(
              expectedNumberOfComments,
            );
          }
        }
      });

      it(`should return a comment and its replies for a
         DRAFT or ARCHIVED posts`, async () => {
        const archivedPost = posts.find(
          (p) =>
            p.status === 'ARCHIVED' &&
            p.authorId === admin.id &&
            comments.find((c) => c.postId === p.id && c.threadParentId),
        );
        const draftPost = posts.find(
          (p) =>
            p.status === 'DRAFT' &&
            p.authorId === admin.id &&
            comments.find((c) => c.postId === p.id && c.threadParentId),
        );
        if (!archivedPost || !draftPost) throw new Error('Missing test posts');

        for (const post of [archivedPost, draftPost]) {
          const postComments = comments.filter(
            (c) => c.postId === post.id && c.depth === 0,
          );

          for (const comment of postComments) {
            const res = await adminHelpers.getComment(
              post.id.toString(),
              comment.id.toString(),
            );

            const repliesData = getData<GetCommentResponseDto>(res);

            expect(repliesData.comment.replyCount).toBe(
              getReplyCountRecursively(repliesData.comment),
            );
          }
        }
      });

      it(`should return 403 FORBIDDEN when trying to get comment and its 
        replies for DRAFT or ARCHIVED post of another user`, async () => {
        const archivedPost = posts.find(
          (p) =>
            p.status === 'ARCHIVED' &&
            p.authorId !== author.id &&
            comments.find((c) => c.postId === p.id && c.threadParentId),
        );
        const draftPost = posts.find(
          (p) =>
            p.status === 'DRAFT' &&
            p.authorId !== author.id &&
            comments.find((c) => c.postId === p.id && c.threadParentId),
        );

        if (!archivedPost || !draftPost) throw new Error('Missing test posts');

        // Not logged in
        for (const post of [archivedPost, draftPost]) {
          const postComments = comments.filter(
            (c) => c.postId === post.id && c.depth === 0,
          );

          for (const parentComment of postComments)
            await expect(
              anonHelpers.getComment(
                post.id.toString(),
                parentComment.id.toString(),
              ),
            ).rejects.toMatchObject(
              createErrorCodeResponse(ERROR_CODES.SERVER.FORBIDDEN),
            );
        }

        // Logged in as another user
        for (const post of [archivedPost, draftPost]) {
          const postComments = comments.filter(
            (c) => c.postId === post.id && c.depth === 0,
          );

          for (const parentComment of postComments)
            await expect(
              authorHelpers.getComment(
                post.id.toString(),
                parentComment.id.toString(),
              ),
            ).rejects.toMatchObject(
              createErrorCodeResponse(ERROR_CODES.SERVER.FORBIDDEN),
            );
        }
      });

      test.each(['ADMIN', 'MOD'])(
        `should allow access to comment and its 
        replies for DRAFT or ARCHIVED post if user is %s`,
        async (role) => {
          const archivedPost = posts.find(
            (p) =>
              p.status === 'ARCHIVED' &&
              p.authorId === admin.id &&
              comments.find((c) => c.postId === p.id),
          );

          if (!archivedPost) throw new Error('Missing test posts');

          const helper = role === 'ADMIN' ? adminHelpers : modHelpers;

          for (const post of [archivedPost]) {
            const postComments = comments.filter(
              (c) => c.postId === post.id && c.depth === 0,
            );

            for (const parentComment of postComments) {
              const res = await helper.getComment(
                post.id.toString(),
                parentComment.id.toString(),
              );

              const repliesData = getData<GetCommentResponseDto>(res);

              expect(repliesData).toBeDefined();
            }
          }
        },
      );
    });
  });

  describe('DELETE /api/v1/posts/{postId}/comments/{id}', () => {
    afterAll(async () => {
      comments = await seedComments();
    });

    it('should delete a comment and all its related replies', async () => {
      const commentWithReplies = comments.find(
        (c, i, arr) =>
          c.userId === admin.id && arr.find((r) => r.threadParentId === c.id),
      );
      if (!commentWithReplies) throw new Error('Missing test comment');

      const res = await adminHelpers.deleteComment(
        commentWithReplies?.postId.toString(),
        commentWithReplies?.id.toString(),
      );

      expect(getMessage(res)).toBe(SUCCESS_MESSAGES.COMMENTS.delete);

      // Deleted Comment
      await expect(
        adminHelpers.deleteComment(
          commentWithReplies?.postId.toString(),
          commentWithReplies?.id.toString(),
        ),
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.NOT_FOUND),
      );

      // All comment replies
      for (const reply of comments.filter(
        (c) => c.threadParentId === commentWithReplies?.id,
      ))
        await expect(
          adminHelpers.deleteComment(
            commentWithReplies?.postId.toString(),
            reply?.id.toString(),
          ),
        ).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.SERVER.NOT_FOUND),
        );

      comments = await seedComments();
    });

    it('should return 401 UNAUTHORIZED when trying to delete comment as guest', async () => {
      return await expect(
        anonHelpers.deleteComment('1', '1'),
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.AUTH.UNAUTHORIZED),
      );
    });

    testInvalidIds(async (id) => {
      return adminHelpers.deleteComment(id, '1');
    }, 'postId');

    testInvalidIds(async (id) => {
      return adminHelpers.deleteComment('1', id);
    }, 'commentId');

    it('should return 404 NOT FOUND for unknown post id or comment id', async () => {
      await expect(
        adminHelpers.deleteComment('999', '1'),
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.NOT_FOUND),
      );

      const publishedPost = posts.find(
        (p) =>
          p.status === 'PUBLISHED' &&
          p.visibility === 'PUBLIC' &&
          comments.find((c) => c.postId === p.id),
      );

      if (!publishedPost) throw new Error('Missing published test post');

      await expect(
        adminHelpers.deleteComment(publishedPost.id.toString(), '999'),
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.NOT_FOUND),
      );
    });

    it(`should return 403 FORBIDDEN when user is not ADMIN or MOD, 
        and the comment does not belong to the user`, async () => {
      const otherUserComment = comments.find((c) => c.userId !== author.id);
      if (!otherUserComment) throw new Error('Missing test comment');

      await expect(
        authorHelpers.deleteComment(
          otherUserComment?.postId.toString(),
          otherUserComment?.id.toString(),
        ),
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.FORBIDDEN),
      );
    });

    test.each(['ADMIN', 'MOD'])(
      `should allow deletion of comment if user is %s`,
      async (role) => {
        const user = users.find((u) => u.role === role);
        if (!user) throw new Error('Missing test user for role: ' + role);

        const otherUserComment = comments.find((c) => c.userId !== user.id);
        if (!otherUserComment) throw new Error('Missing test data');

        const helper = role === 'ADMIN' ? adminHelpers : modHelpers;

        const res = await helper.deleteComment(
          otherUserComment?.postId.toString(),
          otherUserComment.id.toString(),
        );

        expect(getMessage(res)).toBe(SUCCESS_MESSAGES.COMMENTS.delete);

        comments = await seedComments();
      },
    );

    it(`should return error when logged-in user is banned and trying to
      access endpoint`, async () => {
      await prisma.user.update({
        where: {
          id: author.id,
        },
        data: {
          isBanned: true,
        },
      });

      try {
        await expect(
          authorHelpers.deleteComment(
            posts[0].id.toString(),
            comments[0].id.toString(),
          ),
        ).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.AUTH.BANNED),
        );
      } finally {
        await prisma.user.update({
          where: {
            id: author.id,
          },
          data: {
            isBanned: false,
          },
        });
      }
    });
  });

  describe('POST /api/v1/posts/{postId}/comments', () => {
    afterAll(async () => {
      comments = await seedComments();
    });

    it(`should create a comment on post if 
      its status is PUBLISHED and user is logged-in`, async () => {
      const newContent = generateRandomString(20);
      const post = posts.find((p) => p.status === 'PUBLISHED');
      if (!post) throw new Error('Missing post');

      const res = await adminHelpers.createComment(post?.id.toString(), {
        content: newContent,
      });

      expect(getMessage(res)).toBe(SUCCESS_MESSAGES.COMMENTS.create);

      const comment = getData<Comment>(res, 'comment');
      expect(comment.content).toBe(newContent);
      expect(comment.postId).toBe(post?.id);
      expect(comment.userId).toBe(admin.id);
    });

    it(`should create a reply to a comment on post if 
      the post is PUBLISHED, user logged-in and replyToCommentId specified`, async () => {
      const newContent = generateRandomString(20);
      const post = posts.find(
        (p) =>
          p.status === 'PUBLISHED' && comments.find((c) => c.postId === p.id),
      );
      if (!post) throw new Error('Missing post');

      const commentToReplyTo = comments.find((c) => c.postId === post?.id);

      const res = await adminHelpers.createComment(post?.id.toString(), {
        content: newContent,
        replyToCommentId: commentToReplyTo?.id,
      });

      expect(getMessage(res)).toBe(SUCCESS_MESSAGES.COMMENTS.create);

      const comment = getData<Comment>(res, 'comment');
      expect(comment.content).toBe(newContent);
      expect(comment.postId).toBe(post?.id);
      expect(comment.userId).toBe(admin.id);
      expect(comment.threadParentId).toBe(commentToReplyTo?.id);
    });

    it('should return 401 UNAUTHORIZED when trying to create comment as guest', async () => {
      return await expect(
        anonHelpers.createComment('1', { content: generateRandomString(10) }),
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.AUTH.UNAUTHORIZED),
      );
    });

    testInvalidIds(async (id) => {
      return adminHelpers.createComment(id, {
        content: generateRandomString(
          COMMENT_CONSTRAINTS.MIN_CONTENT_LENGTH + 1,
        ),
      });
    }, 'postId');

    testInvalidIds(async (id) => {
      const post = posts.find((p) => p.status === 'PUBLISHED');
      if (!post) throw new Error('Missing post');

      return adminHelpers.createComment(post?.id.toString(), {
        content: generateRandomString(
          COMMENT_CONSTRAINTS.MIN_CONTENT_LENGTH + 1,
        ),
        replyToCommentId: id as any,
      });
    }, 'replyToCommentId');

    test.concurrent.each([
      [
        'is too short',
        generateRandomString(COMMENT_CONSTRAINTS.MIN_CONTENT_LENGTH - 1),
      ],
      [
        'is too long',

        generateRandomString(COMMENT_CONSTRAINTS.MAX_CONTENT_LENGTH + 1),
      ],
    ])(
      'should return validation error when comment content field %s',
      async (_, content) => {
        const post = posts.find((p) => p.status === 'PUBLISHED');
        if (!post) throw new Error('Missing post');

        await expect(
          adminHelpers.createComment(post?.id.toString(), { content }),
        ).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.VALIDATION.VALIDATION_ERROR),
        );
      },
    );

    it('should return 404 NOT FOUND for unknown post id or comment id', async () => {
      // Login: admin -> use adminHelpers
      await expect(
        adminHelpers.createComment((999).toString(), {
          content: generateRandomString(10),
        }),
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.NOT_FOUND),
      );
    });

    it('should return 404 NOT FOUND when replyToCommentId does not exist', async () => {
      const post = posts.find(
        (p) =>
          p.status === 'PUBLISHED' && comments.find((c) => c.postId === p.id),
      );

      if (!post)
        throw new Error('Missing published post with comments for test setup.');

      await expect(
        adminHelpers.createComment(post.id.toString(), {
          content: generateRandomString(10),
          replyToCommentId: 999,
        }),
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.NOT_FOUND),
      );
    });

    it(`should return 403 FORBIDDEN when posting a comment on a 
      non-PUBLISHED post that the user is not the author of`, async () => {
      // Login: author -> use authorHelpers
      const nonPublishedPosts = posts.filter(
        (p) => p.status !== 'PUBLISHED' && p.authorId !== author.id,
      );
      // NOTE: Assuming nonPublishedPosts is guaranteed to be non-empty by test setup
      for (const post of nonPublishedPosts)
        await expect(
          authorHelpers.createComment(post.id.toString(), {
            content: generateRandomString(10),
          }),
        ).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.SERVER.FORBIDDEN),
        );
    });

    it(`should return error when logged-in user is banned and trying to
      access endpoint`, async () => {
      await prisma.user.update({
        where: {
          id: author.id,
        },
        data: {
          isBanned: true,
        },
      });

      try {
        await expect(
          authorHelpers.createComment(posts[0].id.toString(), {
            content: 'new content',
          }),
        ).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.AUTH.BANNED),
        );
      } finally {
        await prisma.user.update({
          where: {
            id: author.id,
          },
          data: {
            isBanned: false,
          },
        });
      }
    });
  });

  describe('PATCH /api/v1/posts/{postId}/comments/{id}', () => {
    afterAll(async () => {
      comments = await seedComments();
    });

    it(`should update a comment's content if the comment's author is
       requesting the endpoint and the post is PUBLISHED`, async () => {
      const newContent = generateRandomString(20);
      const commentForUpdate = comments.find(
        (c) =>
          c.userId === admin.id &&
          posts.find((p) => p.id === c.postId && p.status === 'PUBLISHED'),
      );

      if (!commentForUpdate)
        throw new Error(
          'Missing comment by admin on a published post for test setup.',
        );

      // Login: admin -> use adminHelpers
      const res = await adminHelpers.updateComment(
        commentForUpdate.postId.toString(),
        commentForUpdate.id.toString(),
        newContent,
      );

      expect(getMessage(res)).toBe(SUCCESS_MESSAGES.COMMENTS.update);

      const comment = getData<Comment>(res, 'comment');
      expect(comment.content).toBe(newContent);
    });

    it('should return 401 UNAUTHORIZED when trying to update comment as guest', async () => {
      // No login -> use anonHelpers
      return await expect(
        anonHelpers.updateComment(
          (1).toString(),
          (1).toString(),
          generateRandomString(10),
        ),
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.AUTH.UNAUTHORIZED),
      );
    });

    testInvalidIds(async (id) => {
      return adminHelpers.updateComment(
        (1).toString(),
        id as any,
        generateRandomString(COMMENT_CONSTRAINTS.MIN_CONTENT_LENGTH + 1),
      );
    }, 'postId');

    testInvalidIds(async (id) => {
      return adminHelpers.updateComment(
        id as any,
        (1).toString(),
        generateRandomString(COMMENT_CONSTRAINTS.MIN_CONTENT_LENGTH + 1),
      );
    }, 'commentId');

    test.concurrent.each([
      [
        'is too short',
        generateRandomString(COMMENT_CONSTRAINTS.MIN_CONTENT_LENGTH - 1),
      ],
      [
        'is too long',

        generateRandomString(COMMENT_CONSTRAINTS.MAX_CONTENT_LENGTH + 1),
      ],
    ])(
      'should return validation error when updated comment content %s',
      async (_, content) => {
        const commentForUpdate = comments.find(
          (c) =>
            c.userId === admin.id &&
            posts.find((p) => p.id === c.postId && p.status === 'PUBLISHED'),
        );

        if (!commentForUpdate)
          throw new Error(
            'Missing comment by admin on a published post for test setup (validation test).',
          );

        await expect(
          adminHelpers.updateComment(
            commentForUpdate.postId.toString(),
            commentForUpdate.id.toString(),
            content,
          ),
        ).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.VALIDATION.VALIDATION_ERROR),
        );
      },
    );

    it('should return 404 NOT FOUND for unknown post id or comment id', async () => {
      await expect(
        adminHelpers.updateComment(
          (999).toString(),
          (1).toString(),
          generateRandomString(COMMENT_CONSTRAINTS.MIN_CONTENT_LENGTH + 1),
        ),
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.NOT_FOUND),
      );

      const publishedPost = posts.find(
        (p) =>
          p.status === 'PUBLISHED' &&
          p.visibility === 'PUBLIC' &&
          comments.find((c) => c.postId === p.id),
      );

      if (!publishedPost)
        throw new Error('Missing published test post for 404 check');

      await expect(
        adminHelpers.updateComment(
          publishedPost.id.toString(),
          (999).toString(),
          generateRandomString(COMMENT_CONSTRAINTS.MIN_CONTENT_LENGTH + 1),
        ),
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.NOT_FOUND),
      );
    });

    it('should return 403 FORBIDDEN for updating a comment not belonging to the user', async () => {
      const otherUserComment = comments.find((c) => c.userId !== author.id);

      if (!otherUserComment)
        throw new Error('Missing comment from another user for 403 check.');

      await expect(
        authorHelpers.updateComment(
          otherUserComment.postId.toString(),
          otherUserComment.id.toString(),
          generateRandomString(COMMENT_CONSTRAINTS.MIN_CONTENT_LENGTH + 1),
        ),
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.FORBIDDEN),
      );
    });

    test.each(['ADMIN', 'MOD'])(
      `should allow edit of other user's comment if user is %s`,
      async (role) => {
        const user = users.find((u) => u.role === role);
        if (!user) throw new Error('Missing test user for role: ' + role);

        const helper = role === 'ADMIN' ? adminHelpers : modHelpers;

        const otherUserComment = comments.find((c) => c.userId !== user.id);

        if (!otherUserComment)
          throw new Error('Missing other user comment for role edit test.');

        const res = await helper.updateComment(
          otherUserComment.postId.toString(),
          otherUserComment.id.toString(),
          'new content',
        );

        expect(getMessage(res)).toBe(SUCCESS_MESSAGES.COMMENTS.update);
      },
    );

    it(`should return error when logged-in user is banned and trying to
      access endpoint`, async () => {
      await prisma.user.update({
        where: {
          id: author.id,
        },
        data: {
          isBanned: true,
        },
      });
      try {
        await expect(
          authorHelpers.updateComment(
            posts[0].id.toString(),
            comments[0].id.toString(),
            'new content',
          ),
        ).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.AUTH.BANNED),
        );
      } finally {
        await prisma.user.update({
          where: {
            id: author.id,
          },
          data: {
            isBanned: false,
          },
        });
      }
    });
  });
});

function getReplyCountRecursively(comment: CommentWithReplies) {
  let sum = 0;
  comment.replies?.forEach((c) => {
    sum++;
    if (c.replies) sum += getReplyCountRecursively(c);
  });
  return sum;
}

function checkRepliesRecursively(
  commentsToCheck: CommentWithReplies[],
  allComments: Comment[],
) {
  for (const comment of commentsToCheck) {
    if (comment.replies && comment.replies.length) {
      const expectedReplies = allComments.filter(
        (p) => p.threadParentId === comment.id,
      );
      expect(comment.replies.length).toBe(expectedReplies.length);
      expect(comment.replyCount).toBe(getReplyCountRecursively(comment));

      expect(
        comment.replies.every((c) =>
          expectedReplies.map((r) => r.id).includes(c.id),
        ),
      ).toBe(true);

      for (const reply of comment.replies)
        checkRepliesRecursively(reply.replies, allComments);
    }
  }
}
