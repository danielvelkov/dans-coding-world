import { Comment, Post, User } from '@dans-coding-world/prisma-schema';
import {
  seedUsers,
  seedPosts,
  seedComments,
} from '@dans-coding-world/testing-setup';
import { BaseResponse } from '@dans-coding-world/api-types';
import {
  COMMENT_CONSTRAINTS,
  ERROR_CODES,
  PAGINATION,
  SUCCESS_MESSAGES,
} from '@dans-coding-world/shared-constants';
import { createAuthRouteHelper } from '../helper/auth-request.helper';
import { createAxiosClient } from '../helper/test-client.helper';
import { createPostsRouteHelper } from '../helper/posts-request.helper';
import {
  GetPostCommentRepliesResponseDto,
  GetPostCommentsResponseDto,
} from '@dans-coding-world/shared-post-dto';
import { AxiosInstance, AxiosResponse } from 'axios';
import { createErrorCodeResponse } from '../helper/error-response.helper';
import { passwordGenerator as generateRandomString } from '@dans-coding-world/api-auth';

describe('/api/v1/posts/{postId}/comments', () => {
  let client: AxiosInstance;
  let login: (
    email: string,
    password: string
  ) => Promise<AxiosResponse<BaseResponse>>;
  let getPostComments: (
    id: any,
    params?: any
  ) => Promise<AxiosResponse<unknown>>;
  let getCommentReplies: (
    postId: any,
    commentId: any
  ) => Promise<AxiosResponse<unknown>>;
  let updateComment: (
    postId: any,
    commentId: any,
    content: string
  ) => Promise<AxiosResponse<unknown>>;
  let deleteComment: (
    postId: any,
    commentId: any
  ) => Promise<AxiosResponse<unknown>>;
  let createComment: (
    postId: any,
    commentData: any
  ) => Promise<AxiosResponse<unknown>>;

  let users: User[] = [];
  let posts: Post[] = [];
  let comments: Comment[] = [];

  let admin: User;
  let user: User;

  let publishedPublicPosts: Post[];
  let draftPosts: Post[];
  let archivedPosts: Post[];
  let membersOnlyPosts: Post[];

  beforeAll(async () => {
    users = await seedUsers();
    posts = await seedPosts();
    comments = await seedComments();

    publishedPublicPosts = posts.filter(
      (p) => p.visibility === 'PUBLIC' && p.status === 'PUBLISHED'
    );
    draftPosts = posts.filter((p) => p.status === 'DRAFT');
    archivedPosts = posts.filter((p) => p.status === 'ARCHIVED');
    membersOnlyPosts = posts.filter(
      (p) => p.visibility === 'MEMBERS_ONLY' && p.status === 'PUBLISHED'
    );

    if (!publishedPublicPosts || !draftPosts || !membersOnlyPosts)
      throw new Error('Missing posts');

    admin = users.find((u) => u.role === 'ADMIN') as any;
    user = users.find((u) => u.role === 'USER') as any;

    if (!admin || !user) throw new Error('Missing users');
  });

  beforeEach(() => {
    client = createAxiosClient();
    ({ login } = createAuthRouteHelper(client));
    ({
      getPostComments,
      getCommentReplies,
      deleteComment,
      updateComment,
      createComment,
    } = createPostsRouteHelper(client));
  });

  describe('GET /api/v1/posts/{postId}/comments', () => {
    it(`should return top-level comments for PUBLIC and PUBLISHED posts
      including each comment's direct replies count`, async () => {
      const publishedPosts = posts.filter(
        (p) => p.status === 'PUBLISHED' && p.visibility === 'PUBLIC'
      );
      if (!publishedPosts) throw new Error('Missing published test posts');

      for (const post of publishedPosts) {
        const res = await getPostComments(post.id.toString());
        const { data } = res.data as BaseResponse;

        expect(data).toHaveProperty(
          'message',
          SUCCESS_MESSAGES.COMMENTS.getPostsComments
        );

        const commentsData = data as GetPostCommentsResponseDto;
        const postComments = commentsData.items;

        // Total should show only direct replies to post (depth === 0)
        expect(commentsData.pagination.total).toBe(
          comments.filter((c) => c.postId === post.id && c.depth === 0).length
        );
        expect(commentsData.pagination.limit).toBe(
          PAGINATION.COMMENTS.DEFAULT_ITEMS_PER_PAGE
        );

        for (const comment of postComments) {
          expect(comment.postId).toBe(post.id);
          const expectedComment = comments.find((c) => c.id === comment.id);

          expect(expectedComment?.content).toBe(comment.content);

          const expectedReplies = comments.filter(
            (c) => c.threadParentId === expectedComment?.id
          );
          expect(comment.replyCount).toBe(expectedReplies.length);
        }
      }
    });

    test.each([
      ['is letter', 'a'],
      ['is special character', '@'],
      ['is decimal number', '12.34'],
      ['is negative number', '-5'],
      ['is boolean true', 'true'],
      ['is boolean false', 'false'],
      ['is null string', 'null'],
      ['is undefined string', 'undefined'],
    ])('should return validation error when post id %s', async (_, id) => {
      await expect(getPostComments(id as any)).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.VALIDATION.VALIDATION_ERROR)
      );
    });

    it('should return 404 NOT FOUND for unknown post id', async () => {
      return await expect(getPostComments(999)).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.NOT_FOUND)
      );
    });
    describe('GET /api/v1/posts/{postId}/comments?sortBy[x]=y', () => {
      test.each([
        ['option does not exist', 'modifiedAt', 'asc'],
        ['option exists, but wrong value', 'createdAt', 'descending'],
        ['option exists, but value is empty', 'createdAt', ''],
        ['option exists, but value is wrong case', 'createdAt', 'DESC'],
      ])(
        'should return validation error when sortBy %s',
        async (_, key, value) => {
          return await expect(
            getPostComments(publishedPublicPosts[0].id, {
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
        ['created date (ASC)', 'createdAt', false],
        ['created date (DESC)', 'createdAt', true],
        ['updated date (ASC)', 'updatedAt', false],
        ['updated date (DESC)', 'updatedAt', true],
      ])(
        'should sort items provided that sorting by %s is applied',
        async (_, propName, isAscending: boolean) => {
          const res = await getPostComments(publishedPublicPosts[0].id, {
            sortBy: {
              [propName]: isAscending ? 'asc' : 'desc',
            },
          });

          const { data } = res.data as BaseResponse;
          const commentsData = data as GetPostCommentsResponseDto;

          const sortedItems = [...commentsData.items].sort((prev, next) => {
            if (!prev[propName] || !next[propName]) return 0;
            const prevDate = new Date(prev[propName]).getTime();
            const nextDate = new Date(next[propName]).getTime();
            return isAscending ? prevDate - nextDate : nextDate - prevDate;
          });

          sortedItems.forEach((comment, i) => {
            expect(comment.id).toBe(commentsData.items[i].id);
          });
        }
      );
    });

    describe('GET /api/v1/posts/{postId}/comments?pageOffset=x&pageSize=y', () => {
      let postWithoutCommentsId;
      const totalNumberOfComments = 150;
      const pageSizeOptions = PAGINATION.COMMENTS.ITEMS_PER_PAGE_OPTIONS;
      const defaultPageSize = PAGINATION.COMMENTS.DEFAULT_ITEMS_PER_PAGE;

      beforeAll(async () => {
        const postWithoutComments = posts.find(
          (p) =>
            !comments.find((c) => c.postId === p.id) &&
            p.status === 'PUBLISHED' &&
            p.visibility === 'PUBLIC'
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
        const res = await getPostComments(postWithoutCommentsId, {
          pageOffset: offset,
        });
        const { data } = res.data as BaseResponse;
        const commentsData = data as GetPostCommentsResponseDto;

        expect(commentsData.count).toBe(defaultPageSize);
        expect(commentsData.items.length).toBe(defaultPageSize);
        expect(commentsData.pagination.page).toBe(offset / defaultPageSize + 1);
      });

      it('should return 0 items when offset is beyond total number of comments', async () => {
        const res = await getPostComments(postWithoutCommentsId, {
          pageOffset: totalNumberOfComments,
          pageSize: pageSizeOptions[2],
        });
        const { data } = res.data as BaseResponse;
        const commentsData = data as GetPostCommentsResponseDto;

        expect(commentsData.pagination.page).toBe(
          Math.ceil(totalNumberOfComments / pageSizeOptions[2]) + 1
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
          const res = await getPostComments(postWithoutCommentsId, {
            pageOffset,
            pageSize,
          });
          const { data } = res.data as BaseResponse;
          const commentsData = data as GetPostCommentsResponseDto;

          expect(commentsData.pagination.page).toBe(expectedPageNum);
          expect(commentsData.pagination.total).toBe(totalNumberOfComments);
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
      ])('should return validation error when %s', async (_, params) => {
        await expect(
          getPostComments(postWithoutCommentsId, params)
        ).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.VALIDATION.VALIDATION_ERROR)
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
          await expect(getPostComments(post.id)).rejects.toMatchObject(
            createErrorCodeResponse(ERROR_CODES.AUTH.UNAUTHORIZED)
          );
      });

      it(`should return 403 FORBIDDEN when trying to get comments from a
        DRAFT or ARCHIVED post`, async () => {
        for (const post of draftPosts.concat(archivedPosts))
          await expect(getPostComments(post.id)).rejects.toMatchObject(
            createErrorCodeResponse(ERROR_CODES.SERVER.FORBIDDEN)
          );
      });
    });

    describe('Authenticated user', () => {
      it('should return comments for a MEMBERS-ONLY post when logged in', async () => {
        const membersOnlyPost = posts.find(
          (p) =>
            p.visibility === 'MEMBERS_ONLY' &&
            p.status === 'PUBLISHED' &&
            comments.find((c) => c.postId === p.id)
        );
        if (!membersOnlyPost) throw new Error('Missing test post');

        const expectedNumberOfComments = comments.filter(
          (c) => c.postId === membersOnlyPost.id && c.depth === 0
        ).length;

        await login(user.email, user.password);

        const res = await getPostComments(membersOnlyPost.id);

        const { data } = res.data as BaseResponse;
        const commentsData = data as GetPostCommentsResponseDto;

        expect(commentsData.pagination.total).toBe(expectedNumberOfComments);
      });

      it(`should return comments for a logged-in user's DRAFT or ARCHIVED post`, async () => {
        const archivedPost = posts.find(
          (p) =>
            p.status === 'ARCHIVED' &&
            p.authorId === admin.id &&
            comments.find((c) => c.postId === p.id)
        );
        const draftPost = posts.find(
          (p) =>
            p.status === 'DRAFT' &&
            p.authorId === admin.id &&
            comments.find((c) => c.postId === p.id)
        );
        if (!archivedPost || !draftPost) throw new Error('Missing test posts');

        await login(admin.email, admin.password);

        for (const post of [archivedPost, draftPost]) {
          const expectedNumberOfComments = comments.filter(
            (c) => c.postId === post.id && c.depth === 0
          ).length;
          const res = await getPostComments(post.id);
          const { data } = res.data as BaseResponse;
          const commentsData = data as GetPostCommentsResponseDto;

          expect(commentsData.pagination.total).toBe(expectedNumberOfComments);
        }
      });

      it(`should return 403 FORBIDDEN when trying to get comments 
        for DRAFT or ARCHIVED post of another user`, async () => {
        const archivedPost = posts.find(
          (p) => p.status === 'ARCHIVED' && p.authorId !== user.id
        );
        const draftPost = posts.find(
          (p) => p.status === 'DRAFT' && p.authorId !== user.id
        );
        if (!archivedPost || !draftPost) throw new Error('Missing test posts');

        // Not logged in
        [archivedPost.id, draftPost.id].forEach(
          async (id) =>
            await expect(getPostComments(id)).rejects.toMatchObject(
              createErrorCodeResponse(ERROR_CODES.SERVER.FORBIDDEN)
            )
        );

        await login(user.email, user.password);

        // Logged in as another user
        [archivedPost.id, draftPost.id].forEach(
          async (id) =>
            await expect(getPostComments(id)).rejects.toMatchObject(
              createErrorCodeResponse(ERROR_CODES.SERVER.FORBIDDEN)
            )
        );
      });
    });
  });

  describe('GET /api/v1/posts/{postId}/comments/{id}', () => {
    it(`should return top-level replies for a comment of a 
      PUBLIC and PUBLISHED post including direct replies count`, async () => {
      const publishedPosts = posts.filter(
        (p) =>
          p.status === 'PUBLISHED' &&
          p.visibility === 'PUBLIC' &&
          comments.find((c) => c.postId === p.id && c.threadParentId)
      );
      if (!publishedPosts) throw new Error('Missing published test posts');

      for (const post of publishedPosts) {
        const commentsWithReplies = comments.filter(
          (c, i, arr) =>
            c.postId === post.id &&
            arr.find((r) => r.threadParentId === c.id) &&
            c.depth === 0
        );
        if (!commentsWithReplies.length)
          throw new Error('Missing replies for post');

        for (const comment of commentsWithReplies) {
          const res = await getCommentReplies(post.id.toString(), comment.id);
          const { data } = res.data as BaseResponse;

          expect(data).toHaveProperty(
            'message',
            SUCCESS_MESSAGES.COMMENTS.getCommentReplies
          );

          const commentsData = data as GetPostCommentRepliesResponseDto;
          const replies = commentsData.comment.replies;

          expect(replies.every((c) => c.threadParentId === comment.id)).toBe(
            true
          );

          expect(commentsData.replyCount).toBe(
            comments.filter(
              (c) =>
                c.postId === post.id &&
                c.depth === 1 &&
                c.threadParentId === comment.id
            ).length
          );
        }
      }
    });

    test.each([
      ['is letter', 'a'],
      ['is special character', '@'],
      ['is decimal number', '12.34'],
      ['is negative number', '-5'],
      ['is boolean true', 'true'],
      ['is boolean false', 'false'],
      ['is null string', 'null'],
      ['is undefined string', 'undefined'],
    ])(
      'should return validation error when post id or comment id %s',
      async (_, id) => {
        await expect(getCommentReplies(id as any, 1)).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.VALIDATION.VALIDATION_ERROR)
        );
        await expect(getCommentReplies(1, id as any)).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.VALIDATION.VALIDATION_ERROR)
        );
      }
    );

    it('should return 404 NOT FOUND for unknown post id or comment id', async () => {
      await expect(getCommentReplies(999, 1)).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.NOT_FOUND)
      );

      const publishedPost = posts.find(
        (p) =>
          p.status === 'PUBLISHED' &&
          p.visibility === 'PUBLIC' &&
          comments.find((c) => c.postId === p.id)
      );

      if (!publishedPost) throw new Error('Missing published test post');

      await expect(
        getCommentReplies(publishedPost.id, 999)
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.NOT_FOUND)
      );
    });

    describe('Guest User (Not Authenticated)', () => {
      beforeAll(async () => {
        comments = await seedComments();
      });
      it(`should return 401 UNAUTHORIZED when trying to get replies of a comment 
        from a MEMBERS_ONLY post`, async () => {
        for (const post of membersOnlyPosts)
          await expect(getCommentReplies(post.id, 1)).rejects.toMatchObject(
            createErrorCodeResponse(ERROR_CODES.AUTH.UNAUTHORIZED)
          );
      });

      it(`should return 403 FORBIDDEN when trying to get replies of a comment
         from a DRAFT or ARCHIVED post`, async () => {
        for (const post of draftPosts.concat(archivedPosts))
          await expect(getCommentReplies(post.id, 1)).rejects.toMatchObject(
            createErrorCodeResponse(ERROR_CODES.SERVER.FORBIDDEN)
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
            p.authorId !== user.id
        );
        if (!membersOnlyPosts) throw new Error('Missing test posts');

        await login(user.email, user.password);

        for (const post of membersOnlyPosts) {
          const postComments = comments.filter(
            (c) => c.postId === post.id && c.depth === 0
          );

          for (const comment of postComments) {
            const expectedNumberOfComments = comments.filter(
              (c) => c.postId === post.id && c.threadParentId === comment.id
            ).length;

            const res = await getCommentReplies(post.id, comment.id);

            const { data } = res.data as BaseResponse;
            const repliesData = data as GetPostCommentRepliesResponseDto;

            expect(repliesData.replyCount).toBe(expectedNumberOfComments);
          }
        }
      });

      it(`should return a comment and its replies for a logged-in user's
         DRAFT or ARCHIVED posts`, async () => {
        const archivedPost = posts.find(
          (p) =>
            p.status === 'ARCHIVED' &&
            p.authorId === admin.id &&
            comments.find((c) => c.postId === p.id && c.threadParentId)
        );
        const draftPost = posts.find(
          (p) =>
            p.status === 'DRAFT' &&
            p.authorId === admin.id &&
            comments.find((c) => c.postId === p.id && c.threadParentId)
        );
        if (!archivedPost || !draftPost) throw new Error('Missing test posts');

        await login(admin.email, admin.password);

        for (const post of [archivedPost, draftPost]) {
          const postComments = comments.filter(
            (c) => c.postId === post.id && c.depth === 0
          );

          for (const comment of postComments) {
            const expectedNumberOfComments = comments.filter(
              (c) => c.postId === post.id && c.threadParentId === comment.id
            ).length;

            const res = await getCommentReplies(post.id, comment.id);

            const { data } = res.data as BaseResponse;
            const repliesData = data as GetPostCommentRepliesResponseDto;

            expect(repliesData.replyCount).toBe(expectedNumberOfComments);
          }
        }
      });

      it(`should return 403 FORBIDDEN when trying to get comment and its 
        replies for DRAFT or ARCHIVED post of another user`, async () => {
        const archivedPost = posts.find(
          (p) =>
            p.status === 'ARCHIVED' &&
            p.authorId !== user.id &&
            comments.find((c) => c.postId === p.id && c.threadParentId)
        );
        const draftPost = posts.find(
          (p) =>
            p.status === 'DRAFT' &&
            p.authorId !== user.id &&
            comments.find((c) => c.postId === p.id && c.threadParentId)
        );

        if (!archivedPost || !draftPost) throw new Error('Missing test posts');

        // Not logged in
        for (const post of [archivedPost, draftPost]) {
          const postComments = comments.filter(
            (c) => c.postId === post.id && c.depth === 0
          );

          for (const parentComment of postComments)
            await expect(
              getCommentReplies(post.id, parentComment.id)
            ).rejects.toMatchObject(
              createErrorCodeResponse(ERROR_CODES.SERVER.FORBIDDEN)
            );
        }

        await login(user.email, user.password);

        // Logged in as another user
        for (const post of [archivedPost, draftPost]) {
          const postComments = comments.filter(
            (c) => c.postId === post.id && c.depth === 0
          );

          for (const parentComment of postComments)
            await expect(
              getCommentReplies(post.id, parentComment.id)
            ).rejects.toMatchObject(
              createErrorCodeResponse(ERROR_CODES.SERVER.FORBIDDEN)
            );
        }
      });
    });
  });

  describe('DELETE /api/v1/posts/{postId}/comments/{id}', () => {
    afterAll(async () => {
      comments = await seedComments();
    });

    it('should delete a comment and all its related replies', async () => {
      const commentWithReplies = comments.find(
        (c, i, arr) =>
          c.userId === admin.id && arr.find((r) => r.threadParentId === c.id)
      );
      await login(admin.email, admin.password);

      const res = await deleteComment(
        commentWithReplies?.postId,
        commentWithReplies?.id
      );
      const { data } = res.data as BaseResponse;
      expect(data).toHaveProperty('message', SUCCESS_MESSAGES.COMMENTS.delete);

      // Deleted Comment
      await expect(
        deleteComment(commentWithReplies?.postId, commentWithReplies?.id)
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.NOT_FOUND)
      );

      // All comment replies
      for (const reply of comments.filter(
        (c) => c.threadParentId === commentWithReplies?.id
      ))
        await expect(
          deleteComment(commentWithReplies?.postId, reply?.id)
        ).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.SERVER.NOT_FOUND)
        );

      comments = await seedComments();
    });

    it('should return 401 UNAUTHORIZED when trying to delete comment as guest', async () => {
      return await expect(deleteComment(1, 1)).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.AUTH.UNAUTHORIZED)
      );
    });

    test.each([
      ['is letter', 'a'],
      ['is special character', '@'],
      ['is decimal number', '12.34'],
      ['is negative number', '-5'],
      ['is boolean true', 'true'],
      ['is boolean false', 'false'],
      ['is null string', 'null'],
      ['is undefined string', 'undefined'],
    ])(
      'should return validation error when post id or comment id %s',
      async (_, id) => {
        await login(admin.email, admin.password);
        await expect(deleteComment(id as any, 1)).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.VALIDATION.VALIDATION_ERROR)
        );
        await expect(deleteComment(1, id as any)).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.VALIDATION.VALIDATION_ERROR)
        );
      }
    );

    it('should return 404 NOT FOUND for unknown post id or comment id', async () => {
      await login(admin.email, admin.password);
      await expect(deleteComment(999, 1)).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.NOT_FOUND)
      );

      const publishedPost = posts.find(
        (p) =>
          p.status === 'PUBLISHED' &&
          p.visibility === 'PUBLIC' &&
          comments.find((c) => c.postId === p.id)
      );

      if (!publishedPost) throw new Error('Missing published test post');

      await expect(deleteComment(publishedPost.id, 999)).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.NOT_FOUND)
      );
    });

    it('should return 403 FORBIDDEN for deleting a comment not belonging to the user', async () => {
      await login(admin.email, admin.password);
      const otherUserComment = comments.find((c) => c.userId !== admin.id);
      await expect(
        deleteComment(otherUserComment?.postId, otherUserComment?.id)
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.FORBIDDEN)
      );
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

      await login(admin.email, admin.password);

      const res = await createComment(post?.id, { content: newContent });

      const { data } = res.data as BaseResponse;
      expect(data).toHaveProperty('message', SUCCESS_MESSAGES.COMMENTS.create);

      const comment = (data as any).comment as Comment;
      expect(comment.content).toBe(newContent);
      expect(comment.postId).toBe(post?.id);
      expect(comment.userId).toBe(admin.id);
    });

    it(`should create a reply to a comment on post if 
      the post is PUBLISHED, user logged-in and replyToCommentId specified`, async () => {
      const newContent = generateRandomString(20);
      const post = posts.find(
        (p) =>
          p.status === 'PUBLISHED' && comments.find((c) => c.postId === p.id)
      );

      const commentToReplyTo = comments.find((c) => c.postId === post?.id);

      await login(admin.email, admin.password);

      const res = await createComment(post?.id, {
        content: newContent,
        replyToCommentId: commentToReplyTo?.id,
      });

      const { data } = res.data as BaseResponse;
      expect(data).toHaveProperty('message', SUCCESS_MESSAGES.COMMENTS.create);

      const comment = (data as any).comment as Comment;
      expect(comment.content).toBe(newContent);
      expect(comment.postId).toBe(post?.id);
      expect(comment.userId).toBe(admin.id);
      expect(comment.threadParentId).toBe(commentToReplyTo?.id);
    });

    it('should return 401 UNAUTHORIZED when trying to create comment as guest', async () => {
      return await expect(
        createComment(1, { content: generateRandomString(10) })
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.AUTH.UNAUTHORIZED)
      );
    });

    test.each([
      ['is letter', 'a'],
      ['is special character', '@'],
      ['is decimal number', '12.34'],
      ['is negative number', '-5'],
      ['is boolean true', 'true'],
      ['is boolean false', 'false'],
      ['is null string', 'null'],
      ['is undefined string', 'undefined'],
    ])(
      'should return validation error when post id or replyToCommentId %s',
      async (_, id) => {
        await login(admin.email, admin.password);
        await expect(
          createComment(id as any, { content: generateRandomString(10) })
        ).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.VALIDATION.VALIDATION_ERROR)
        );

        const post = posts.find((p) => p.status === 'PUBLISHED');

        await expect(
          createComment(post?.id, {
            content: generateRandomString(10),
            replyToCommentId: id as any,
          })
        ).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.VALIDATION.VALIDATION_ERROR)
        );
      }
    );

    test.each([
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
        await login(admin.email, admin.password);

        await expect(
          createComment(post?.id, { content })
        ).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.VALIDATION.VALIDATION_ERROR)
        );
      }
    );

    it('should return 404 NOT FOUND for unknown post id or comment id', async () => {
      await login(admin.email, admin.password);
      await expect(
        createComment(999, { content: generateRandomString(10) })
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.NOT_FOUND)
      );
    });

    it('should return 404 NOT FOUND when replyToCommentId does not exist', async () => {
      const post = posts.find(
        (p) =>
          p.status === 'PUBLISHED' && comments.find((c) => c.postId === p.id)
      );

      await login(admin.email, admin.password);

      await expect(
        createComment(post?.id, {
          content: generateRandomString(10),
          replyToCommentId: 999,
        })
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.NOT_FOUND)
      );
    });

    it(`should return 403 FORBIDDEN when posting a comment on a 
      non-PUBLISHED post that the user is not the author of`, async () => {
      await login(admin.email, admin.password);
      const nonPublishedPosts = posts.filter(
        (p) => p.status !== 'PUBLISHED' && p.authorId !== admin.id
      );
      for (const post of nonPublishedPosts)
        await expect(
          createComment(post.id, { content: generateRandomString(10) })
        ).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.SERVER.FORBIDDEN)
        );
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
          posts.find((p) => p.id === c.postId && p.status === 'PUBLISHED')
      );
      await login(admin.email, admin.password);

      const res = await updateComment(
        commentForUpdate?.postId,
        commentForUpdate?.id,
        newContent
      );
      const { data } = res.data as BaseResponse;
      expect(data).toHaveProperty('message', SUCCESS_MESSAGES.COMMENTS.update);

      const comment = (data as any).comment as Comment;
      expect(comment.content).toBe(newContent);
    });

    it('should return 401 UNAUTHORIZED when trying to update comment as guest', async () => {
      return await expect(
        updateComment(1, 1, generateRandomString(10))
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.AUTH.UNAUTHORIZED)
      );
    });

    test.each([
      ['is letter', 'a'],
      ['is special character', '@'],
      ['is decimal number', '12.34'],
      ['is negative number', '-5'],
      ['is boolean true', 'true'],
      ['is boolean false', 'false'],
      ['is null string', 'null'],
      ['is undefined string', 'undefined'],
    ])(
      'should return validation error when post id or comment id %s',
      async (_, id) => {
        await login(admin.email, admin.password);
        await expect(
          updateComment(
            id as any,
            1,
            generateRandomString(COMMENT_CONSTRAINTS.MIN_CONTENT_LENGTH + 1)
          )
        ).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.VALIDATION.VALIDATION_ERROR)
        );
        await expect(
          updateComment(
            1,
            id as any,
            generateRandomString(COMMENT_CONSTRAINTS.MIN_CONTENT_LENGTH + 1)
          )
        ).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.VALIDATION.VALIDATION_ERROR)
        );
      }
    );

    test.each([
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
            posts.find((p) => p.id === c.postId && p.status === 'PUBLISHED')
        );

        await login(admin.email, admin.password);

        await expect(
          updateComment(commentForUpdate?.postId, commentForUpdate?.id, content)
        ).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.VALIDATION.VALIDATION_ERROR)
        );
      }
    );

    it('should return 404 NOT FOUND for unknown post id or comment id', async () => {
      await login(admin.email, admin.password);
      await expect(
        updateComment(
          999,
          1,
          generateRandomString(COMMENT_CONSTRAINTS.MIN_CONTENT_LENGTH + 1)
        )
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.NOT_FOUND)
      );

      const publishedPost = posts.find(
        (p) =>
          p.status === 'PUBLISHED' &&
          p.visibility === 'PUBLIC' &&
          comments.find((c) => c.postId === p.id)
      );

      if (!publishedPost) throw new Error('Missing published test post');

      await expect(
        updateComment(
          publishedPost.id,
          999,
          generateRandomString(COMMENT_CONSTRAINTS.MIN_CONTENT_LENGTH + 1)
        )
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.NOT_FOUND)
      );
    });

    it('should return 403 FORBIDDEN for updating a comment not belonging to the user', async () => {
      await login(admin.email, admin.password);
      const otherUserComment = comments.find((c) => c.userId !== admin.id);
      await expect(
        updateComment(
          otherUserComment?.postId,
          otherUserComment?.id,
          generateRandomString(COMMENT_CONSTRAINTS.MIN_CONTENT_LENGTH + 1)
        )
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.FORBIDDEN)
      );
    });
  });
});
