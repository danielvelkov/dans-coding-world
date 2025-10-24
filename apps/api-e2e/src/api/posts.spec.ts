import { Post, PostStatus, User } from '@dans-coding-world/prisma-schema';
import { seedUsers, seedPosts } from '@dans-coding-world/testing-setup';
import { BaseResponse } from '@dans-coding-world/api-types';
import {
  PAGINATION,
  SUCCESS_MESSAGES,
  VALIDATION_MESSAGES,
} from '@dans-coding-world/shared-constants';
import { createAuthRouteHelper } from '../helper/auth-request.helper';
import { createAxiosClient } from '../helper/test-client.helper';
import { createPostsRouteHelper } from '../helper/posts-request.helper';
import { GetPostsResponseDto } from '@dans-coding-world/shared-post-dto';
import { AxiosInstance } from 'axios';

describe('/api/v1/posts', () => {
  let client: AxiosInstance;
  let login, getPosts;

  let users: User[] = [];
  let posts: Post[] = [];
  let PUBLIC_POSTS_NUM: number;
  let DRAFT_POSTS_NUM: number;
  let MEMBERS_ONLY_POSTS_NUM: number;

  beforeAll(async () => {
    users = await seedUsers();
    posts = await seedPosts();

    PUBLIC_POSTS_NUM = posts.filter((p) => p.status === 'PUBLISHED').length;
    DRAFT_POSTS_NUM = posts.filter((p) => p.status === 'DRAFT').length;
    MEMBERS_ONLY_POSTS_NUM = posts.filter(
      (p) => p.visibility === 'MEMBERS_ONLY' && p.status === 'PUBLISHED'
    ).length;

    if (!PUBLIC_POSTS_NUM || !DRAFT_POSTS_NUM || !MEMBERS_ONLY_POSTS_NUM)
      throw new Error('Missing posts');
  });

  beforeEach(() => {
    client = createAxiosClient();
    ({ login } = createAuthRouteHelper(client));
    ({ getPosts } = createPostsRouteHelper(client));
  });

  describe('GET /api/v1/posts - Guest User (Not Authenticated)', () => {
    it('should retrieve only PUBLIC-PUBLISHED posts by default', async () => {
      const res = await getPosts();
      const { data } = res.data as BaseResponse;

      expect(data).toHaveProperty('message', SUCCESS_MESSAGES.POSTS.getAll);

      const postsData = data as GetPostsResponseDto;
      expect(postsData).toBeDefined();
      expect(postsData.count).toBe(PUBLIC_POSTS_NUM);
      expect(postsData.items).toHaveLength(PUBLIC_POSTS_NUM);

      expect(postsData.pagination).toMatchObject({
        page: 1,
        limit: PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE,
        total: PUBLIC_POSTS_NUM,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      });
    });

    it('should return empty results when filtering by DRAFT or ARCHIVED status', async () => {
      const res = await getPosts({
        filterBy: {
          status: ['DRAFT', 'ARCHIVED'],
        },
      });

      const { data } = res.data as BaseResponse;
      const postsData = data as GetPostsResponseDto;

      expect(postsData.count).toBe(0);
      expect(postsData.items).toHaveLength(0);
      expect(postsData.pagination).toMatchObject({
        page: 1,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      });
    });

    it('should return MEMBERS_ONLY posts with content masked', async () => {
      const res = await getPosts({
        filterBy: {
          visibility: ['MEMBERS_ONLY'],
        },
      });

      const { data } = res.data as BaseResponse;
      const postsData = data as GetPostsResponseDto;

      expect(postsData.count).toBe(MEMBERS_ONLY_POSTS_NUM);
      expect(postsData.items).toHaveLength(MEMBERS_ONLY_POSTS_NUM);
      expect(
        postsData.items.every(
          (p) => p.content === VALIDATION_MESSAGES.posts.membersOnly
        )
      );
    });
  });

  describe('GET /api/v1/posts - Authenticated Author', () => {
    test.each([
      ['DRAFT and ARCHIVED posts', ['ARCHIVED', 'DRAFT'] as PostStatus[]],
      ['DRAFT posts only', ['DRAFT'] as PostStatus[]],
      ['ARCHIVED posts only', ['ARCHIVED'] as PostStatus[]],
    ])(
      'should retrieve their own %s when filtering by status',
      async (_, allowedPostStatus) => {
        const filteredPosts = posts.filter((p) =>
          allowedPostStatus.includes(p.status)
        );
        const authorId = filteredPosts[0].authorId;
        const author = users.find((u) => u.id === authorId);

        if (!author) throw new Error('Missing test author');

        await login(author.email, author.password);

        const res = await getPosts({
          filterBy: {
            status: allowedPostStatus,
          },
        });

        const { data } = res.data as BaseResponse;
        const postsData = data as GetPostsResponseDto;

        expect(postsData.count).toBe(filteredPosts.length);
        expect(postsData.items).toHaveLength(filteredPosts.length);

        // Verify all returned posts belong to the author
        postsData.items.forEach((post) => {
          expect(post.authorId).toBe(authorId);
          expect(allowedPostStatus).toContain(post.status);
        });
      }
    );
  });

  describe('GET /api/v1/posts - Authenticated Non-Author', () => {
    test.each([
      ['DRAFT posts', ['DRAFT']],
      ['ARCHIVED posts', ['ARCHIVED']],
      ['DRAFT and ARCHIVED posts', ['DRAFT', 'ARCHIVED']],
    ])('should not retrieve other users %s', async (_, allowedPostStatus) => {
      const regularUser = users.find((u) => u.role === 'USER');
      if (!regularUser) throw new Error('Missing regular user');

      await login(regularUser.email, regularUser.password);

      const res = await getPosts({
        filterBy: {
          status: allowedPostStatus,
        },
      });

      const { data } = res.data as BaseResponse;
      const postsData = data as GetPostsResponseDto;

      // Should only see their own drafts, if any
      postsData.items.forEach((post) => {
        expect(post.authorId).toBe(regularUser.id);
      });
    });
  });
});
