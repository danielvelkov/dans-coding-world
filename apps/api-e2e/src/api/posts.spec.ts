/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { client as prisma } from '@dans-coding-world/prisma-schema';
import type {
  Post,
  PostStatus,
  PostWithAuthorProfile,
  Tag,
  User,
} from '@dans-coding-world/prisma-schema';
import {
  seedUsers,
  seedPosts,
  seedTags,
  attachTagsToPost,
} from '@dans-coding-world/api-tools';
import {
  ERROR_CODES,
  PAGINATION,
  POST_CONSTRAINTS,
  SUCCESS_MESSAGES,
  TAG_CONSTRAINTS,
  VALIDATION_MESSAGES,
} from '@dans-coding-world/shared-constants';
import { setupClient } from '../helper/test-client.helper';
import { createPostsRouteHelper } from '../helper/posts-request.helper';
import type {
  GetPostsMetadataResponse,
  GetPostsResponseDto,
  GetTagsResponse,
} from '@dans-coding-world/shared-post-dto';
import { createErrorCodeResponse } from '../helper/error-response.helper';
import { passwordGenerator as generateRandomString } from '@dans-coding-world/helpers';
import { StatusCodes } from 'http-status-codes';
import { testInvalidIds } from '../helper/test-cases.helper';
import { getData, getMessage } from '../helper/common.helper';
import { API_ENDPOINTS } from '@dans-coding-world/shared-data-access-api';

describe('/api/v1/posts', () => {
  let users: User[] = [];
  let posts: Post[] = [];
  let tags: Tag[] = [];

  let admin: User;
  let author: User;
  let mod: User;
  let user: User;

  let PUBLISHED_PUBLIC_POSTS_NUM: number;
  let PUBLISHED_MEMBERS_ONLY_POSTS_NUM: number;

  const testData = {
    publicOnlyTags: [] as Tag[],
    privateAdminTags: [] as Tag[],
    privateAuthorTags: [] as Tag[],
    privateAuthorTags_AlsoUsedOnPublic: [] as Tag[], // Used in both public and private posts
    privateAdminTags_AlsoUsedOnPublic: [] as Tag[], // Used in both public and private posts
  };

  type PostHelpers = ReturnType<typeof createPostsRouteHelper>;

  let adminHelpers: PostHelpers;
  let userHelpers: PostHelpers;
  let authorHelpers: PostHelpers;
  let modHelpers: PostHelpers;
  let anonHelpers: PostHelpers; // For unauthenticated requests

  beforeAll(async () => {
    users = await seedUsers();
    posts = await seedPosts();
    tags = await seedTags();

    PUBLISHED_PUBLIC_POSTS_NUM = posts.filter(
      (p) => p.visibility === 'PUBLIC' && p.status === 'PUBLISHED',
    ).length;
    PUBLISHED_MEMBERS_ONLY_POSTS_NUM = posts.filter(
      (p) => p.visibility === 'MEMBERS_ONLY' && p.status === 'PUBLISHED',
    ).length;

    if (!PUBLISHED_PUBLIC_POSTS_NUM || !PUBLISHED_MEMBERS_ONLY_POSTS_NUM)
      throw new Error('Missing posts');

    if (tags.length < 30) throw new Error('Not enough test tags');

    const TAG_RANGES = {
      PUBLIC_ONLY: { start: 0, end: 5 },
      PRIVATE_ADMIN: { start: 5, end: 10 },
      PRIVATE_AUTHOR: { start: 10, end: 15 },
      PRIVATE_AND_PUBLIC_ADMIN: { start: 20, end: 25 },
      PRIVATE_AND_PUBLIC_AUTHOR: { start: 25, end: 30 },
    };

    testData.publicOnlyTags = tags.slice(
      TAG_RANGES.PUBLIC_ONLY.start,
      TAG_RANGES.PUBLIC_ONLY.end,
    );
    testData.privateAdminTags = tags.slice(
      TAG_RANGES.PRIVATE_ADMIN.start,
      TAG_RANGES.PRIVATE_ADMIN.end,
    );
    testData.privateAuthorTags = tags.slice(
      TAG_RANGES.PRIVATE_AUTHOR.start,
      TAG_RANGES.PRIVATE_AUTHOR.end,
    );
    testData.privateAuthorTags_AlsoUsedOnPublic = tags.slice(
      TAG_RANGES.PRIVATE_AND_PUBLIC_AUTHOR.start,
      TAG_RANGES.PRIVATE_AND_PUBLIC_AUTHOR.end,
    );
    testData.privateAdminTags_AlsoUsedOnPublic = tags.slice(
      TAG_RANGES.PRIVATE_AND_PUBLIC_ADMIN.start,
      TAG_RANGES.PRIVATE_AND_PUBLIC_ADMIN.end,
    );

    admin = users.find((u) => u.role === 'ADMIN') as User;
    author = users.find((u) => u.role === 'AUTHOR') as User;
    user = users.find((u) => u.role === 'USER') as User;
    mod = users.find((u) => u.role === 'MOD') as User;

    if (!admin || !author || !user) throw new Error('Missing users');

    // Organize posts by type
    const postsByType = {
      published: posts.filter((p) => p.status === 'PUBLISHED'),
      privateAdmin: posts.filter(
        (p) => p.status !== 'PUBLISHED' && p.authorId === admin.id,
      ),
      privateAuthor: posts.filter(
        (p) => p.status !== 'PUBLISHED' && p.authorId === author.id,
      ),
    };

    if (
      !postsByType.published.length ||
      !postsByType.privateAdmin.length ||
      !postsByType.privateAuthor.length
    ) {
      throw new Error('Missing posts');
    }

    const attachTagsToPosts = async (posts: Post[], tagGroups: Tag[][]) => {
      for (const post of posts) {
        for (const tagGroup of tagGroups) {
          await attachTagsToPost(
            post.id,
            tagGroup.map((t) => t.id),
          );
        }
      }
    };

    await attachTagsToPosts(postsByType.published, [
      testData.publicOnlyTags,
      testData.privateAuthorTags_AlsoUsedOnPublic,
      testData.privateAdminTags_AlsoUsedOnPublic,
    ]);
    await attachTagsToPosts(postsByType.privateAdmin, [
      testData.privateAdminTags,
      testData.privateAdminTags_AlsoUsedOnPublic,
    ]);
    await attachTagsToPosts(postsByType.privateAuthor, [
      testData.privateAuthorTags,
      testData.privateAuthorTags_AlsoUsedOnPublic,
    ]);

    [adminHelpers, userHelpers, authorHelpers, modHelpers, anonHelpers] =
      await Promise.all([
        setupClient(createPostsRouteHelper, admin),
        setupClient(createPostsRouteHelper, user),
        setupClient(createPostsRouteHelper, author),
        setupClient(createPostsRouteHelper, mod),
        setupClient(createPostsRouteHelper, undefined),
      ]);
  });

  describe('GET /api/v1/posts/:id', () => {
    it('should return post data for PUBLIC and PUBLISHED posts', async () => {
      const publishedPost = posts.find(
        (p) => p.status === 'PUBLISHED' && p.visibility === 'PUBLIC',
      );
      if (!publishedPost) throw new Error('Missing published test post');

      const res = await anonHelpers.getPost(publishedPost.id.toString());

      expect(getMessage(res)).toBe(SUCCESS_MESSAGES.POSTS.get);

      const postData = getData<Post>(res, 'post');

      expect(postData.id).toBe(publishedPost.id);
      expect(postData.title).toBe(publishedPost.title);
      expect(postData.content).toBe(publishedPost.content);
    });

    it('should return post with included post tags', async () => {
      const expectedTags = [
        ...testData.privateAdminTags_AlsoUsedOnPublic,
        ...testData.privateAuthorTags_AlsoUsedOnPublic,
        ...testData.publicOnlyTags,
      ];

      const publicPost = posts.find(
        (p) => p.status === 'PUBLISHED' && p.visibility === 'PUBLIC',
      );
      if (!publicPost) throw new Error('Missing test post');

      const res = await anonHelpers.getPost(publicPost.id.toString());

      const postData = getData<Post & { tags: string[] }>(res, 'post');
      expect(postData.tags.length).toBe(expectedTags.length);

      for (const tag of expectedTags)
        expect(postData.tags.includes(tag.name)).toBe(true);
    });

    it('should return posts with their author details included', async () => {
      const publicPost = posts.find(
        (p) => p.status === 'PUBLISHED' && p.visibility === 'PUBLIC',
      );
      if (!publicPost) throw new Error('Missing test post');

      const res = await anonHelpers.getPost(publicPost.id.toString());

      const post = getData<PostWithAuthorProfile>(res, 'post');

      const expectedUser = users.find((u) => u.id === post.authorId);
      expect(post.author.username).toBe(expectedUser?.username);
    });

    test.each([
      ['masked when not logged in', false],
      ['shown when logged in', true],
    ])(
      'should return MEMBERS_ONLY posts with content %s',
      async (_, isLoggedIn) => {
        const membersOnlyPost = posts.find(
          (p) => p.status === 'PUBLISHED' && p.visibility === 'MEMBERS_ONLY',
        );
        if (!membersOnlyPost) throw new Error('Missing published test post');

        const res = await (isLoggedIn
          ? userHelpers.getPost(membersOnlyPost.id.toString())
          : anonHelpers.getPost(membersOnlyPost.id.toString()));

        expect(getMessage(res)).toBe(SUCCESS_MESSAGES.POSTS.get);

        const postData = getData<Post>(res, 'post');

        expect(postData.id).toBe(membersOnlyPost.id);
        expect(postData.title).toBe(membersOnlyPost.title);
        expect(postData.content).toBe(
          isLoggedIn
            ? membersOnlyPost.content
            : VALIDATION_MESSAGES.posts.membersOnly,
        );
      },
    );

    testInvalidIds((id) => anonHelpers.getPost(id), 'post id');

    it('should return 404 NOT FOUND for unknown post id', async () => {
      return await expect(anonHelpers.getPost('9999')).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.NOT_FOUND),
      );
    });

    it('should return 403 FORBIDDEN for DRAFT or ARCHIVED post of another user', async () => {
      const archivedPostOfAnotherUser = posts.find(
        (p) => p.status === 'ARCHIVED' && p.authorId !== author.id,
      );
      const draftPostOfAnotherUser = posts.find(
        (p) => p.status === 'DRAFT' && p.authorId !== author.id,
      );
      if (!archivedPostOfAnotherUser || !draftPostOfAnotherUser)
        throw new Error('Missing test posts');

      // Not logged in
      for (const id of [
        archivedPostOfAnotherUser.id,
        draftPostOfAnotherUser.id,
      ])
        await expect(anonHelpers.getPost(id.toString())).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.SERVER.FORBIDDEN),
        );

      // Logged in as another user
      for (const id of [
        archivedPostOfAnotherUser.id,
        draftPostOfAnotherUser.id,
      ])
        await expect(
          authorHelpers.getPost(id.toString()),
        ).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.SERVER.FORBIDDEN),
        );
    });

    test.each(['ADMIN', 'MOD'])(
      'should allow access to DRAFT or ARCHIVED posts of another user when %s',
      async (role) => {
        const archivedPostOfAnotherUser = posts.find(
          (p) => p.status === 'ARCHIVED' && p.authorId !== admin.id,
        );
        const draftPostOfAnotherUser = posts.find(
          (p) => p.status === 'DRAFT' && p.authorId !== admin.id,
        );
        if (!archivedPostOfAnotherUser || !draftPostOfAnotherUser)
          throw new Error('Missing test posts');

        const helper = role === 'ADMIN' ? adminHelpers : modHelpers;

        for (const id of [
          archivedPostOfAnotherUser.id,
          draftPostOfAnotherUser.id,
        ]) {
          const res = await helper.getPost(id.toString());

          expect(getMessage(res)).toBe(SUCCESS_MESSAGES.POSTS.get);

          const postData = getData<Post>(res, 'post');
          expect(postData.id).toBe(id);
        }
      },
    );
  });

  describe('GET /api/v1/posts', () => {
    describe('Guest User (Not Authenticated)', () => {
      it(`should retrieve only PUBLIC-PUBLISHED and 
    MEMBERS_ONLY-PUBLISHED posts by default`, async () => {
        const res = await anonHelpers.getPosts();

        expect(getMessage(res)).toBe(SUCCESS_MESSAGES.POSTS.getAll);

        const postsData = getData<GetPostsResponseDto>(res);
        expect(postsData).toBeDefined();

        const expectedTotal =
          PUBLISHED_PUBLIC_POSTS_NUM + PUBLISHED_MEMBERS_ONLY_POSTS_NUM;
        const expectedPages = Math.ceil(
          (PUBLISHED_PUBLIC_POSTS_NUM + PUBLISHED_MEMBERS_ONLY_POSTS_NUM) /
            PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE,
        );

        expect(postsData.pagination).toMatchObject({
          page: 1,
          limit: PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE,
          total: expectedTotal,
          totalPages: expectedPages,
          hasNext: expectedTotal > PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE,
          hasPrev: false,
        });
      });

      it('should return empty results when filtering by DRAFT or ARCHIVED status', async () => {
        const res = await anonHelpers.getPosts({
          filterBy: {
            status: ['DRAFT', 'ARCHIVED'],
          },
        });

        const postsData = getData<GetPostsResponseDto>(res);

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
        const { data } = await anonHelpers.getPosts({
          filterBy: {
            visibility: ['MEMBERS_ONLY'],
          },
        });

        const postsData = data as GetPostsResponseDto;

        expect(postsData.count).toBe(PUBLISHED_MEMBERS_ONLY_POSTS_NUM);
        expect(postsData.items).toHaveLength(PUBLISHED_MEMBERS_ONLY_POSTS_NUM);
        expect(
          postsData.items.every(
            (p) => p.content === VALIDATION_MESSAGES.posts.membersOnly,
          ),
        );
      });

      it('should return posts with their associated tags included', async () => {
        const res = await anonHelpers.getPosts();

        const postsData = getData<GetPostsResponseDto>(res);

        for (const post of postsData.items)
          expect((post as any).tags.length).toBeGreaterThan(0);
      });

      it('should return posts with their author details included', async () => {
        const res = await anonHelpers.getPosts();

        const postsData = getData<GetPostsResponseDto>(res);

        for (const post of postsData.items) {
          const expectedUser = users.find((u) => u.id === post.authorId);
          expect(post.author.username).toBe(expectedUser?.username);
        }
      });

      it('should allow filtering by tag name', async () => {
        const res = await anonHelpers.getPosts({
          filterBy: {
            tags: [...testData.publicOnlyTags.map((t) => t.name)],
          },
        });

        const postsData = getData<GetPostsResponseDto>(res);

        expect(postsData.pagination.total).toBe(
          PUBLISHED_PUBLIC_POSTS_NUM + PUBLISHED_MEMBERS_ONLY_POSTS_NUM,
        );
        for (const post of postsData.items)
          expect(
            (post as any).tags.some((name: string) =>
              testData.publicOnlyTags.map((t) => t.name).includes(name),
            ),
          ).toBe(true);
      });

      it('should allow filtering by publishedDate year', async () => {
        const uniqueYears = [
          ...new Set(
            posts
              .filter((p) => p.publishedAt)
              .map((p) => new Date(p.publishedAt ?? '').getFullYear()),
          ),
        ];
        if (uniqueYears.length < 2)
          throw new Error('Need more test posts for different published years');

        for (const year of uniqueYears) {
          const res = await anonHelpers.getPosts({
            filterBy: {
              year,
            },
          });

          const postsData = getData<GetPostsResponseDto>(res);

          for (const post of postsData.items)
            if (post.publishedAt) {
              const postYear = new Date(post.publishedAt).getFullYear();
              expect(postYear).toBe(year);
            }
        }
      });

      it('should allow filtering by user id', async () => {
        for (const userId of users.map((u) => u.id)) {
          const res = await anonHelpers.getPosts({
            filterBy: {
              userId,
            },
          });

          const postsData = getData<GetPostsResponseDto>(res);

          for (const post of postsData.items)
            expect(post.authorId).toBe(userId);
        }
      });

      it(`should not return other users' private posts when filtering by user id`, async () => {
        for (const userId of users.map((u) => u.id)) {
          const res = await anonHelpers.getPosts({
            filterBy: {
              userId,
            },
          });

          const postsData = getData<GetPostsResponseDto>(res);

          for (const post of postsData.items) {
            expect(post.authorId).toBe(userId);
            expect(post.status).toBe('PUBLISHED');
          }
        }
      });

      it(`should not show other users' private posts that contain those tags`, async () => {
        const res = await anonHelpers.getPosts({
          filterBy: {
            tags: [...testData.privateAuthorTags.map((t) => t.name)],
          },
        });
        const postsData = getData<GetPostsResponseDto>(res);

        expect(postsData.count).toBe(0);
      });

      test.concurrent.each([
        [
          'is too short',
          generateRandomString(TAG_CONSTRAINTS.MIN_NAME_LENGTH - 1, {
            includeUppercase: false,
            includeSymbols: false,
          }),
        ],
        [
          'is too long',
          generateRandomString(TAG_CONSTRAINTS.MAX_NAME_LENGTH + 1, {
            includeUppercase: false,
            includeSymbols: false,
          }),
        ],
        [
          'contains anything other than lower case letters, hyphens and numbers',
          generateRandomString(10, {
            includeUppercase: true,
          }),
        ],
      ])(
        'should return validation error when filterBy tag % ',
        async (_, tag) => {
          await expect(
            anonHelpers.getPosts({
              filterBy: {
                tags: [tag],
              },
            }),
          ).rejects.toMatchObject(
            createErrorCodeResponse(ERROR_CODES.VALIDATION.VALIDATION_ERROR),
          );
        },
      );
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
            anonHelpers.getPosts({
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
        ['published date (ASC)', 'publishedAt', false],
        ['published date (DESC)', 'publishedAt', true],
        ['created date (ASC)', 'createdAt', false],
        ['created date (DESC)', 'createdAt', true],
        ['updated date (ASC)', 'updatedAt', false],
        ['updated date (DESC)', 'updatedAt', true],
      ])(
        'should sort items provided that sorting by %s is applied',
        async (_, propName, isDescending: boolean) => {
          const res = await anonHelpers.getPosts({
            sortBy: {
              [propName]: isDescending ? 'desc' : 'asc',
            },
          });

          const postsData = getData<GetPostsResponseDto>(res);

          const sortedItems = [...postsData.items].sort((prev, next) => {
            if (!prev[propName] || !next[propName]) return 0;
            const prevDate = new Date(prev[propName]).getTime();
            const nextDate = new Date(next[propName]).getTime();
            return isDescending ? nextDate - prevDate : prevDate - nextDate;
          });

          sortedItems.forEach((post, i) => {
            expect(post.id).toBe(postsData.items[i].id);
          });
        },
      );
    });

    describe('?pageOffset=x&pageSize=y', () => {
      const totalNumberOfPosts = 100;
      const pageSizeOptions = PAGINATION.POSTS.ITEMS_PER_PAGE_OPTIONS;
      const defaultPageSize = PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE;

      beforeAll(async () => {
        const posts = Array.from({ length: totalNumberOfPosts }).map((_, i) => {
          return {
            authorId: author.id,
            content: 'Content number #' + i,
            title: 'Title number #' + i,
            status: 'PUBLISHED',
            visibility: 'PUBLIC',
          } as Post;
        });
        await seedPosts(posts, { clearExisting: true, useDefaults: false });
      });

      afterAll(async () => {
        posts = await seedPosts();
      });

      it(`should return the default items per page (${defaultPageSize})
       when pageSize is not defined`, async () => {
        const offset = 10;
        const res = await anonHelpers.getPosts({
          pageOffset: offset,
        });
        const postsData = getData<GetPostsResponseDto>(res);

        expect(postsData.count).toBe(defaultPageSize);
        expect(postsData.items.length).toBe(defaultPageSize);
        expect(postsData.pagination.page).toBe(offset / defaultPageSize + 1);
      });

      it('should return 0 items when offset is beyond total number of posts', async () => {
        const res = await anonHelpers.getPosts({
          pageOffset: totalNumberOfPosts,
          pageSize: pageSizeOptions[2],
        });
        const postsData = getData<GetPostsResponseDto>(res);

        expect(postsData.pagination.page).toBe(
          Math.ceil(totalNumberOfPosts / pageSizeOptions[2]) + 1,
        );
        expect(postsData.count).toBe(0);
        expect(postsData.items.length).toBe(0);
      });

      test.concurrent.each([
        [1, 0, pageSizeOptions[0]],
        [2, pageSizeOptions[0], pageSizeOptions[0]],
        [3, pageSizeOptions[0] * 2, pageSizeOptions[0]],
        [2, pageSizeOptions[1], pageSizeOptions[1]],
        [5, pageSizeOptions[1] * 4, pageSizeOptions[1]],
        [
          Math.ceil(totalNumberOfPosts / pageSizeOptions[0]) + 1,
          totalNumberOfPosts,
          pageSizeOptions[0],
        ],
      ])(
        'should return page #%s when [ offset: %s ; pageLimit %s ]',
        async (expectedPageNum, pageOffset, pageSize) => {
          const res = await anonHelpers.getPosts({
            pageOffset,
            pageSize,
          });
          const postsData = getData<GetPostsResponseDto>(res);

          expect(postsData.pagination.page).toBe(expectedPageNum);
          expect(postsData.pagination.total).toBe(totalNumberOfPosts);
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
        [
          'year is decimal',
          {
            filterBy: {
              year: 1.5,
            },
          },
        ],
        [
          'year is letter',
          {
            filterBy: {
              year: 'a',
            },
          },
        ],
        [
          'userId is letter',
          {
            filterBy: {
              userId: 'a',
            },
          },
        ],
        [
          'userId is a decimal',
          {
            filterBy: {
              userId: 1.5,
            },
          },
        ],
      ])('should return validation error when %s', async (_, params) => {
        await expect(anonHelpers.getPosts(params)).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.VALIDATION.VALIDATION_ERROR),
        );
      });
    });

    describe('Authenticated Author', () => {
      test.concurrent.each([
        ['DRAFT and ARCHIVED posts', ['ARCHIVED', 'DRAFT'] as PostStatus[]],
        ['DRAFT posts', ['DRAFT'] as PostStatus[]],
        ['ARCHIVED posts', ['ARCHIVED'] as PostStatus[]],
      ])(
        'should retrieve only their own private %s when filtering by status which excludes PUBLISHED',
        async (_, allowedPostStatus) => {
          const filteredPosts = posts.filter(
            (p) =>
              allowedPostStatus.includes(p.status) && p.authorId === author.id,
          );

          const res = await authorHelpers.getPosts({
            filterBy: {
              status: allowedPostStatus,
            },
          });

          const postsData = getData<GetPostsResponseDto>(res);

          expect(postsData.count).toBe(filteredPosts.length);
          expect(postsData.items).toHaveLength(filteredPosts.length);

          // Verify all returned posts belong to the author
          postsData.items.forEach((post) => {
            expect(post.authorId).toBe(author.id);
            expect(allowedPostStatus).toContain(post.status);
          });
        },
      );

      it(`should retrieve own private posts when author is logged in and filtering by tags`, async () => {
        const res = await authorHelpers.getPosts({
          filterBy: {
            tags: [
              ...testData.privateAuthorTags_AlsoUsedOnPublic.map((t) => t.name),
            ],
          },
        });
        const postsData = getData<GetPostsResponseDto>(res);

        for (const post of postsData.items) {
          if (post.status !== 'PUBLISHED')
            expect(post.authorId).toBe(author.id);

          for (const tag of (post as any).tags)
            expect(
              testData.privateAuthorTags_AlsoUsedOnPublic
                .map((t) => t.name)
                .includes(tag),
            ).toBe(true);
        }
      });

      it(`should retrieve only own private posts when author is logged in and filtering by year`, async () => {
        const expectedYear = posts
          .find((p) => p.authorId === author.id && p.publishedAt)
          ?.publishedAt?.getFullYear();

        const res = await authorHelpers.getPosts({
          filterBy: {
            year: expectedYear,
          },
        });
        const postsData = getData<GetPostsResponseDto>(res);

        for (const post of postsData.items) {
          if (post.publishedAt) {
            const postYear = new Date(post.publishedAt).getFullYear();
            expect(postYear).toBe(expectedYear);
          }

          if (post.status !== 'PUBLISHED')
            expect(post.authorId).toBe(author.id);
        }
      });

      it(`should retrieve own private posts when user is logged in and filtering by userId and status`, async () => {
        const res = await authorHelpers.getPosts({
          filterBy: {
            userId: author.id,
            status: ['DRAFT', 'ARCHIVED', 'PUBLISHED'],
          },
        });
        const postsData = getData<GetPostsResponseDto>(res);
        expect(postsData.items.some((p) => p.status !== 'PUBLISHED')).toBe(
          true,
        );

        for (const post of postsData.items) {
          expect(post.authorId).toBe(author.id);
        }
      });

      test.concurrent.each([
        { visibility: ['PUBLIC'] },
        { status: ['PUBLISHED'], visibility: ['PUBLIC'] },
        { status: ['DRAFT'], visibility: ['PUBLIC'] },
        { status: ['DRAFT'] },
        { status: ['ARCHIVED'] },
        { visibility: ['PUBLIC'] },
        { visibility: ['MEMBERS_ONLY'] },
        { status: [] },
      ])(
        'should find his own posts with or without filters + search query specified',
        async (filters) => {
          const expectedPost = posts.find(
            (p) =>
              p.authorId === author.id &&
              (!filters?.status?.length || filters.status.includes(p.status)) &&
              (!filters?.visibility?.length ||
                filters.visibility.includes(p.visibility)),
          );
          if (!expectedPost) throw new Error('Missing private post');

          const res = await anonHelpers.getPosts({
            viewerId: author.id,
            filterBy: filters,
            searchQuery: expectedPost.title.substring(5),
          });

          const postsData = getData<GetPostsResponseDto>(res);

          expect(postsData.count).toBe(1);
          expect(postsData.items[0].id).toBe(expectedPost.id);
        },
      );

      it.concurrent(
        `should not retrieve other users' drafts and 
      archived posts when filtering by their userId`,
        async () => {
          const resPublished = await authorHelpers.getPosts({
            filterBy: {
              userId: admin.id,
            },
          });
          const postsDataPublished = getData<GetPostsResponseDto>(resPublished);

          expect(postsDataPublished.count).toBeGreaterThan(0);
          for (const post of postsDataPublished.items) {
            expect(post.status).toBe('PUBLISHED');
            expect(post.authorId).toBe(admin.id);
          }

          const resPrivate = await authorHelpers.getPosts({
            filterBy: {
              userId: admin.id,
              status: ['ARCHIVED', 'DRAFT'],
            },
          });
          const postsDataPrivate = getData<GetPostsResponseDto>(resPrivate);
          expect(postsDataPrivate.count).toBe(0);
        },
      );

      it.concurrent(
        `should not retrieve other users' drafts and 
      archived posts when overlapping tags are present`,
        async () => {
          const res = await authorHelpers.getPosts({
            filterBy: {
              tags: [
                ...testData.privateAdminTags.map((t) => t.name),
                ...testData.privateAuthorTags.map((t) => t.name),
              ],
            },
          });
          const postsData = getData<GetPostsResponseDto>(res);

          for (const post of postsData.items) {
            if (post.status !== 'PUBLISHED')
              expect(post.authorId).toBe(author.id);

            for (const tag of (post as any).tags)
              expect(
                testData.privateAuthorTags_AlsoUsedOnPublic
                  .map((t) => t.name)
                  .includes(tag),
              ).toBe(true);
          }
        },
      );
    });

    describe('GET /api/v1/posts - Authenticated Non-Author/Admin/Mod', () => {
      test.concurrent.each([
        [['DRAFT']],
        [['ARCHIVED']],
        [['DRAFT', 'ARCHIVED']],
      ])(
        'should not retrieve other users %j posts',
        async (allowedPostStatus) => {
          const res = await userHelpers.getPosts({
            filterBy: {
              status: allowedPostStatus,
            },
          });

          const postsData = getData<GetPostsResponseDto>(res);

          // Should only see their own drafts, if any
          postsData.items.forEach((post) => {
            expect(post.authorId).toBe(user.id);
          });
        },
      );

      it.concurrent(
        `should not retrieve other users drafts and 
      archived posts when search query is present`,
        async () => {
          const privatePostFromAnotherAuthor = posts.find(
            (p) =>
              (p.status === 'DRAFT' || p.status === 'ARCHIVED') &&
              p.authorId !== user.id,
          );
          if (!privatePostFromAnotherAuthor)
            throw new Error('Missing post by other user');

          const resWithFilters = await userHelpers.getPosts({
            searchQuery: privatePostFromAnotherAuthor.title,
          });

          const postsData = getData<GetPostsResponseDto>(resWithFilters);
          expect(postsData.count).toBe(0);
        },
      );
    });

    describe('GET /api/v1/posts - Authenticated ADMIN', () => {
      it(`should be able to retrieve users' private posts
         when logged in as ADMIN and filtering by status`, async () => {
        const res = await adminHelpers.getPosts({
          pageSize: PAGINATION.POSTS.ITEMS_PER_PAGE_OPTIONS[2],
          filterBy: {
            status: ['DRAFT', 'ARCHIVED'],
          },
        });

        const postsData = getData<GetPostsResponseDto>(res);

        expect(
          postsData.items.some(
            (p) => p.status !== 'PUBLISHED' && p.authorId !== admin.id,
          ),
        ).toBe(true);
      });

      it(`should be able to retrieve ALL of user's posts
         when logged in as ADMIN and filtering by userId and status`, async () => {
        const res = await adminHelpers.getPosts({
          pageSize: PAGINATION.POSTS.ITEMS_PER_PAGE_OPTIONS[2],
          filterBy: {
            status: ['DRAFT', 'ARCHIVED'],
            userId: author.id,
          },
        });

        const postsData = getData<GetPostsResponseDto>(res);

        for (const post of postsData.items) {
          expect(post.authorId).toBe(author.id);
          expect(post.status).not.toBe('PUBLISHED');
        }
      });
    });
  });

  describe('POST /api/v1/posts', () => {
    const VALID_POST_DATA = {
      title: 'Totally valid title',
      content: 'Totally valid content',
      isDraft: true,
      isMembersOnly: false,
    };

    afterAll(async () => {
      posts = await seedPosts();
    });

    test.each([
      {
        ...VALID_POST_DATA,
      },
      {
        ...VALID_POST_DATA,
        isDraft: false,
      },
      {
        ...VALID_POST_DATA,
        isMembersOnly: true,
      },
    ])(
      'should create a post if post data is valid and logged in user is either ADMIN or AUTHOR',
      async (postData) => {
        for (const role of ['ADMIN', 'AUTHOR']) {
          const helper = role === 'ADMIN' ? adminHelpers : authorHelpers;

          postData.title = generateRandomString(
            POST_CONSTRAINTS.MAX_TITLE_LENGTH - 1,
          );

          const res = await helper.createPost(postData);

          expect(getMessage(res)).toBe(SUCCESS_MESSAGES.POSTS.create);
          const post = getData<Post>(res, 'post');

          expect(post).toBeDefined();
          expect(post.title).toBe(postData.title);

          expect(post.status).toBe(postData.isDraft ? 'DRAFT' : 'PUBLISHED');
          expect(post.visibility).toBe(
            postData.isMembersOnly ? 'MEMBERS_ONLY' : 'PUBLIC',
          );
          // Should set published date when post is PUBLISHED
          if (postData.isDraft) expect(post.publishedAt).toBe(null);
          else expect(post.publishedAt).toBeTruthy();
        }
      },
    );

    it('should create tags if new names are specified in post data', async () => {
      const uniqueTags = Array.from({ length: 3 }).map(() =>
        generateRandomString(10, {
          includeSymbols: false,
          includeUppercase: false,
        }),
      );

      const res = await authorHelpers.createPost({
        ...VALID_POST_DATA,
        title: generateRandomString(POST_CONSTRAINTS.MAX_TITLE_LENGTH - 1),
        tags: [...uniqueTags],
      });
      const post = getData<Post>(res, 'post');

      for (const tag of uniqueTags)
        expect((post as any).tags.includes(tag)).toBe(true);

      const res_tags = await authorHelpers.getTags();

      const { items } = getData<GetTagsResponse>(res_tags);
      for (const tag of uniqueTags)
        expect(items.map((t) => t.name).includes(tag)).toBe(true);
    });

    it('should assign tags if existing tags are specified', async () => {
      const res = await authorHelpers.createPost({
        ...VALID_POST_DATA,
        title: generateRandomString(POST_CONSTRAINTS.MAX_TITLE_LENGTH - 1),
        tags: [...testData.publicOnlyTags.map((t) => t.name)],
      });
      const post = getData<Post>(res, 'post');

      for (const tag of testData.publicOnlyTags.map((t) => t.name))
        expect((post as any).tags.includes(tag)).toBe(true);
    });

    test.concurrent.each([
      [
        'title is too long',
        {
          ...VALID_POST_DATA,
          title: generateRandomString(POST_CONSTRAINTS.MAX_TITLE_LENGTH + 1),
        },
      ],
      [
        'title is too short',
        {
          ...VALID_POST_DATA,
          title: generateRandomString(POST_CONSTRAINTS.MIN_TITLE_LENGTH - 1),
        },
      ],
      [
        'content is too long',
        {
          ...VALID_POST_DATA,
          content: generateRandomString(
            POST_CONSTRAINTS.MAX_CONTENT_LENGTH + 1,
          ),
        },
      ],
      [
        'content is too short',
        {
          ...VALID_POST_DATA,
          content: generateRandomString(
            POST_CONSTRAINTS.MIN_CONTENT_LENGTH - 1,
          ),
        },
      ],
      [
        'required fields are missing (content)',
        { ...VALID_POST_DATA, content: undefined },
      ],
      [
        'required fields are missing (isDraft)',

        { ...VALID_POST_DATA, isDraft: undefined },
      ],
      [
        'required fields are missing (isMembersOnly)',

        { ...VALID_POST_DATA, isMembersOnly: undefined },
      ],
      [
        'specified tag to attach/create is too short',
        {
          ...VALID_POST_DATA,
          tags: [
            generateRandomString(TAG_CONSTRAINTS.MIN_NAME_LENGTH - 1, {
              includeUppercase: false,
              includeSymbols: false,
            }),
          ],
        },
      ],
      [
        'specified tag to attach/create is too long',
        {
          ...VALID_POST_DATA,
          tags: [
            generateRandomString(TAG_CONSTRAINTS.MAX_NAME_LENGTH + 1, {
              includeUppercase: false,
              includeSymbols: false,
            }),
          ],
        },
      ],
      [
        'specified tag to attach/create contains upper case letter',
        {
          ...VALID_POST_DATA,
          tags: [
            generateRandomString(TAG_CONSTRAINTS.MAX_NAME_LENGTH - 1, {
              includeUppercase: true,
              includeSymbols: false,
            }),
          ],
        },
      ],
      [
        'specified tag to attach/create contains symbol different than hyphen',
        {
          ...VALID_POST_DATA,
          tags: [
            '%' +
              generateRandomString(TAG_CONSTRAINTS.MIN_NAME_LENGTH + 1, {
                includeUppercase: false,
                includeSymbols: false,
              }),
          ],
        },
      ],
      [
        'specified tags to attach/create are the same',
        {
          ...VALID_POST_DATA,
          tags: ['unique-tag-1234', 'unique-tag-1234'],
        },
      ],
    ])('should return validation error when %s', async (_, postData) => {
      return await expect(
        adminHelpers.createPost(postData as any),
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.VALIDATION.VALIDATION_ERROR),
      );
    });

    it.concurrent(
      `should return 403 FORBIDDEN, when user creating the post is not ADMIN or AUTHOR`,
      async () => {
        return await expect(
          userHelpers.createPost({
            ...VALID_POST_DATA,
            title: generateRandomString(POST_CONSTRAINTS.MIN_TITLE_LENGTH + 1),
          }),
        ).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.SERVER.FORBIDDEN),
        );
      },
    );

    it('should return validation error when creating a post with the same title', async () => {
      const existingPostTitle = posts[0].title;

      return await expect(
        authorHelpers.createPost({
          ...VALID_POST_DATA,
          title: existingPostTitle,
        }),
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.VALIDATION.POST_EXISTS),
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
          authorHelpers.createPost({
            ...VALID_POST_DATA,
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

  describe('PATCH /api/v1/posts/:id', () => {
    test.each([
      [
        'content',
        generateRandomString(POST_CONSTRAINTS.MIN_CONTENT_LENGTH + 1),
      ],
      ['title', generateRandomString(POST_CONSTRAINTS.MIN_TITLE_LENGTH + 1)],
      ['status', 'ARCHIVED'],
      ['visibility', 'MEMBERS_ONLY'],
    ])(
      `should update a post's %s if logged in as its author`,
      async (propName, value) => {
        const postForUpdate = posts.find((p) => p.authorId === author.id);
        if (!postForUpdate) throw new Error('Missing test post');

        const res = await authorHelpers.updatePost(
          postForUpdate.id.toString(),
          {
            [propName]: value,
          } as any,
        );

        expect(getMessage(res)).toBe(SUCCESS_MESSAGES.POSTS.update);
        const post = getData<Post>(res, 'post');

        expect(post).toBeDefined();
        expect(post.id).toBe(postForUpdate.id);
        expect(post[propName]).toBe(value);
        // Expect updatedAt date to change
        expect(postForUpdate.updatedAt.getTime()).toBeLessThan(
          new Date(post.updatedAt).getTime(),
        );
      },
    );

    test.each([
      [
        'content',
        generateRandomString(POST_CONSTRAINTS.MIN_CONTENT_LENGTH + 1),
      ],
      ['title', generateRandomString(POST_CONSTRAINTS.MIN_TITLE_LENGTH + 1)],
      ['status', 'ARCHIVED'],
      ['visibility', 'MEMBERS_ONLY'],
    ])(
      `should update a post's %s if logged in as admin, regardless if author or not`,
      async (propName, value) => {
        const postForUpdate = posts.find((p) => p.authorId === author.id);
        if (!postForUpdate) throw new Error('Missing test post');

        const res = await adminHelpers.updatePost(postForUpdate.id.toString(), {
          [propName]: value,
        } as any);

        const post = getData<Post>(res, 'post');

        expect(post).toBeDefined();
        expect(post.id).toBe(postForUpdate.id);
        expect(post[propName]).toBe(value);
        // Expect updatedAt date to change
        expect(postForUpdate.updatedAt.getTime()).toBeLessThan(
          new Date(post.updatedAt).getTime(),
        );
      },
    );

    it('should set publishedAt date when post status is updated from DRAFT to PUBLISHED', async () => {
      const postForUpdate = posts.find(
        (p) => p.status === 'DRAFT' && p.authorId === author.id,
      );
      if (!postForUpdate) throw new Error('Missing test post');
      expect(postForUpdate.publishedAt).toBeFalsy();

      const res = await authorHelpers.updatePost(postForUpdate.id.toString(), {
        status: 'PUBLISHED',
      } as any);

      const post = getData<Post>(res, 'post');

      expect(post.publishedAt).toBeTruthy();
    });

    test.concurrent.each([
      [
        'title is too long',
        {
          title: generateRandomString(POST_CONSTRAINTS.MAX_TITLE_LENGTH + 1),
        },
      ],
      [
        'title is too short',
        {
          title: generateRandomString(POST_CONSTRAINTS.MIN_TITLE_LENGTH - 1),
        },
      ],
      [
        'content is too long',
        {
          content: generateRandomString(
            POST_CONSTRAINTS.MAX_CONTENT_LENGTH + 1,
          ),
        },
      ],
      [
        'content is too short',
        {
          content: generateRandomString(
            POST_CONSTRAINTS.MIN_CONTENT_LENGTH - 1,
          ),
        },
      ],
      [
        'specified tag to attach/create is too short',
        {
          tags: [
            generateRandomString(TAG_CONSTRAINTS.MIN_NAME_LENGTH - 1, {
              includeUppercase: false,
              includeSymbols: false,
            }),
          ],
        },
      ],
      [
        'specified tag to attach/create is too long',
        {
          tags: [
            generateRandomString(TAG_CONSTRAINTS.MAX_NAME_LENGTH + 1, {
              includeUppercase: false,
              includeSymbols: false,
            }),
          ],
        },
      ],
      [
        'specified tag to attach/create contains upper case letter',
        {
          tags: [
            generateRandomString(TAG_CONSTRAINTS.MAX_NAME_LENGTH - 1, {
              includeUppercase: true,
              includeSymbols: false,
            }),
          ],
        },
      ],
      [
        'specified tag to attach/create contains symbol different than hyphen',
        {
          tags: [
            '%' +
              generateRandomString(TAG_CONSTRAINTS.MIN_NAME_LENGTH + 1, {
                includeUppercase: false,
                includeSymbols: false,
              }),
          ],
        },
      ],
      [
        'specified tags to attach/create are the same',
        {
          tags: ['unique-tag-1234', 'unique-tag-1234'],
        },
      ],
      [
        'clearTags is number (1)',
        {
          clearTags: 1 as any,
        },
      ],
      [
        'clearTags is number (0)',
        {
          clearTags: 1 as any,
        },
      ],
      [
        'clearTags is not boolean nor "true" (case-sensitive)',
        {
          clearTags: 'True' as any,
        },
      ],
      [
        'clearTags is not boolean nor "false" (case-sensitive)',
        {
          clearTags: 'False' as any,
        },
      ],
    ])('should return validation error when %s', async (_, postData) => {
      const postForUpdate = posts.find((p) => p.authorId === author.id);
      if (!postForUpdate) throw new Error('Missing test post');

      return await expect(
        authorHelpers.updatePost(postForUpdate.id.toString(), postData as any),
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.VALIDATION.VALIDATION_ERROR),
      );
    });

    it.concurrent(
      'should return 404 NOT FOUND when post for update does not exist',
      async () => {
        return await expect(
          authorHelpers.updatePost('9999', {
            content: 'NEW post content',
          } as any),
        ).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.SERVER.NOT_FOUND),
        );
      },
    );

    it.concurrent(
      `should return 403 FORBIDDEN when the user is not ADMIN or AUTHOR`,
      async () => {
        const usersAndMods = users.filter(
          (u) => !(u.role === 'ADMIN' || u.role === 'AUTHOR'),
        );

        for (const u of usersAndMods) {
          const helper = u.role === 'USER' ? userHelpers : modHelpers;
          await expect(
            helper.updatePost('1', {
              content: generateRandomString(
                POST_CONSTRAINTS.MIN_CONTENT_LENGTH + 1,
              ),
            }),
          ).rejects.toMatchObject(
            createErrorCodeResponse(ERROR_CODES.SERVER.FORBIDDEN),
          );
        }
      },
    );

    it(`should return 403 FORBIDDEN for authors, 
      when trying to update another author's post`, async () => {
      const postForUpdateFromAnotherUser = posts.find(
        (p) => p.authorId === admin.id,
      );
      if (!postForUpdateFromAnotherUser) throw new Error('Missing test post');

      await expect(
        authorHelpers.updatePost(postForUpdateFromAnotherUser.id.toString(), {
          content: generateRandomString(
            POST_CONSTRAINTS.MIN_CONTENT_LENGTH + 1,
          ),
        }),
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.FORBIDDEN),
      );
    });

    it('should create tags if new names are specified in update post data', async () => {
      const postForUpdate = posts.find((p) => p.authorId === author.id);
      if (!postForUpdate) throw new Error('Missing test post');
      const uniqueTags = Array.from({ length: 3 }).map(() =>
        generateRandomString(10, {
          includeSymbols: false,
          includeUppercase: false,
        }),
      );

      const res = await authorHelpers.updatePost(postForUpdate.id.toString(), {
        tags: [...uniqueTags],
      });
      const post = getData<Post>(res, 'post');

      for (const tag of uniqueTags)
        expect((post as any).tags.includes(tag)).toBe(true);

      const res_tags = await authorHelpers.getTags();

      const { items } = getData<GetTagsResponse>(res_tags);
      for (const tag of uniqueTags)
        expect(items.map((t) => t.name).includes(tag)).toBe(true);
    });

    it('should assign and overwrite post tags if existing tags are specified', async () => {
      const postForUpdate = posts.find((p) => p.authorId === author.id);
      if (!postForUpdate) throw new Error('Missing test post');

      const res = await authorHelpers.updatePost(postForUpdate.id.toString(), {
        tags: [...testData.publicOnlyTags.map((t) => t.name)],
      });
      const post = getData<Post & { tags: string[] }>(res, 'post');

      for (const tag of testData.publicOnlyTags.map((t) => t.name))
        expect(post.tags.includes(tag)).toBe(true);
    });

    it('should clear post tags if "clearTags" field is true', async () => {
      const postForUpdate = posts.find((p) => p.authorId === author.id);
      if (!postForUpdate) throw new Error('Missing test post');

      const res = await authorHelpers.getPost(postForUpdate.id.toString());
      const post = getData<Post & { tags: string[] | undefined }>(res, 'post');
      expect(post.tags?.length).toBeGreaterThan(0);

      const resFromUpdate = await authorHelpers.updatePost(
        postForUpdate.id.toString(),
        {
          clearTags: true,
          tags: ['tag-2'], // even with tags defined
        },
      );
      const updatedPost = getData<Post & { tags: string[] }>(
        resFromUpdate,
        'post',
      );
      expect(updatedPost.tags.length).toBe(0);
    });

    it(`should return validation error when updating a
      post title to be the same as another one`, async () => {
      const postForUpdate = posts.find((p) => p.authorId === admin.id);
      if (!postForUpdate) throw new Error('Missing test post');

      const anotherPost = posts.find((p) => p.id !== postForUpdate.id);
      if (!anotherPost) throw new Error('Missing test post');

      const existingPostTitle = anotherPost.title;

      return await expect(
        adminHelpers.updatePost(postForUpdate.id.toString(), {
          title: existingPostTitle,
        }),
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.VALIDATION.POST_EXISTS),
      );
    });

    testInvalidIds(
      async (id) => adminHelpers.updatePost(id, { content: 'NEW CONTENT' }),
      'post id',
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
          authorHelpers.updatePost(posts[0].id.toString(), {
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

  describe('DELETE /api/v1/posts/:id', () => {
    afterAll(async () => {
      posts = await seedPosts();
    });

    const deletedIds: number[] = [];

    it('should remove post when its authenticated author is requesting it', async () => {
      const postForDeletion = posts.find(
        (p) => p.authorId === author.id && !deletedIds.includes(p.id),
      );
      if (!postForDeletion) throw new Error('Missing test post');

      const deleteRes = await adminHelpers.client.request(
        API_ENDPOINTS.POSTS.BY_ID(postForDeletion.id),
        { method: 'DELETE' },
      );
      expect(deleteRes.status).toBe(StatusCodes.OK);

      expect(getMessage(deleteRes.data)).toBe(SUCCESS_MESSAGES.POSTS.delete);

      deletedIds.push(postForDeletion.id);

      await expect(
        authorHelpers.deletePost(postForDeletion.id.toString()),
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.NOT_FOUND),
      );
    });

    it(`should return 404 NOT FOUND when trying to delete post that does not exist`, async () => {
      await expect(adminHelpers.deletePost('9999')).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.NOT_FOUND),
      );
    });

    it(`should return 403 FORBIDDEN when trying to delete another user's post`, async () => {
      const postForDeletionFromAnotherUser = posts.find(
        (p) => p.authorId === admin.id && !deletedIds.includes(p.id),
      );
      if (!postForDeletionFromAnotherUser) throw new Error('Missing test post');

      await expect(
        authorHelpers.deletePost(postForDeletionFromAnotherUser.id.toString()),
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.FORBIDDEN),
      );
    });

    it(`should allow deletion of another user's post when logged in user is ADMIN`, async () => {
      const postForDeletionFromAnotherUser = posts.find(
        (p) => p.authorId === author.id && !deletedIds.includes(p.id),
      );
      if (!postForDeletionFromAnotherUser) throw new Error('Missing test post');

      const deleteRes = await adminHelpers.client.request(
        API_ENDPOINTS.POSTS.BY_ID(postForDeletionFromAnotherUser.id),
        { method: 'DELETE' },
      );

      expect(deleteRes.status).toBe(StatusCodes.OK);

      expect(getMessage(deleteRes.data)).toBe(SUCCESS_MESSAGES.POSTS.delete);
    });

    it('deleting the last post referencing created tags should delete them also', async () => {
      const persistentTags = [
        'tag-that-wont-be-deleted-1',
        'tag-that-wont-be-deleted-2',
      ];

      const res = await authorHelpers.createPost({
        content: generateRandomString(10),
        title: generateRandomString(10),
        tags: persistentTags,
        isDraft: false,
        isMembersOnly: false,
      });

      const postWithTagsForDeletion = getData<Post>(res, 'post');

      for (const tag of persistentTags)
        expect((postWithTagsForDeletion as any).tags.includes(tag)).toBe(true);

      await authorHelpers.deletePost(postWithTagsForDeletion.id.toString());

      const res_tags = await authorHelpers.getTags();

      const { count } = getData<GetTagsResponse>(res_tags);
      expect(count).toBe(0);
    });

    testInvalidIds(async (id) => {
      return adminHelpers.deletePost(id);
    }, 'post id');

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
      return await expect(
        authorHelpers.deletePost(posts[0].id.toString()),
      ).rejects.toMatchObject(createErrorCodeResponse(ERROR_CODES.AUTH.BANNED));
    });
  });

  describe('GET /api/v1/posts/metadata', () => {
    it('should return all unique years for PUBLISHED posts', async () => {
      const expectedYears = posts
        .filter((p) => p.publishedAt && p.status === 'PUBLISHED')
        .map((p) => new Date(p.publishedAt!).getFullYear())
        .reduce(
          (acc, prev) => (acc.includes(prev) ? acc : [prev, ...acc]),
          [] as number[],
        );
      const res = await anonHelpers.getPostsMetadata();
      expect(getMessage(res)).toBe(SUCCESS_MESSAGES.POSTS.getMetadata);

      const { years } = getData<GetPostsMetadataResponse>(res);
      expect(years).toEqual(expect.arrayContaining(expectedYears));
      expect(years).toHaveLength(expectedYears.length);
    });

    it('does not include years with only non-published posts', async () => {
      const expectedYears = posts
        .filter((p) => p.publishedAt && p.status === 'PUBLISHED')
        .map((p) => new Date(p.publishedAt!).getFullYear())
        .reduce(
          (acc, prev) => (acc.includes(prev) ? acc : [prev, ...acc]),
          [] as number[],
        );

      const notExpectedYears = posts
        .filter((p) => p.publishedAt && p.status !== 'PUBLISHED')
        .map((p) => new Date(p.publishedAt!).getFullYear())
        .reduce(
          (acc, prev) => (acc.includes(prev) ? acc : [prev, ...acc]),
          [] as number[],
        )
        .filter((year) => !expectedYears.includes(year));

      const res = await anonHelpers.getPostsMetadata();

      const { years } = getData<GetPostsMetadataResponse>(res);
      for (const year of notExpectedYears) {
        expect(years).not.toContain(year);
      }
    });
  });
});
