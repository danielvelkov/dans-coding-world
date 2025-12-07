/* eslint-disable @typescript-eslint/no-explicit-any */
import { Post, PostStatus, Tag, User } from '@dans-coding-world/prisma-schema';
import {
  seedUsers,
  seedPosts,
  seedTags,
  attachTagsToPost,
} from '@dans-coding-world/testing-setup';
import { BaseResponse } from '@dans-coding-world/api-types';
import {
  ERROR_CODES,
  PAGINATION,
  POST_CONSTRAINTS,
  SUCCESS_MESSAGES,
  TAG_CONSTRAINTS,
  VALIDATION_MESSAGES,
} from '@dans-coding-world/shared-constants';
import { createAuthRouteHelper } from '../helper/auth-request.helper';
import { createAxiosClient } from '../helper/test-client.helper';
import { createPostsRouteHelper } from '../helper/posts-request.helper';
import {
  CreatePostDto,
  GetPostsMetadataResponse,
  GetPostsResponseDto,
  GetTagsResponse,
  UpdatePostDto,
} from '@dans-coding-world/shared-post-dto';
import { AxiosInstance, AxiosResponse } from 'axios';
import { createErrorCodeResponse } from '../helper/error-response.helper';
import { passwordGenerator as generateRandomString } from '@dans-coding-world/api-auth';
import { StatusCodes } from 'http-status-codes';

describe('/api/v1/posts', () => {
  let client: AxiosInstance;
  let login: (
    email: string,
    password: string
  ) => Promise<AxiosResponse<BaseResponse>>;
  let getTags: () => Promise<AxiosResponse<unknown>>;
  let getPosts: (params?: any) => Promise<AxiosResponse<unknown>>;
  let getPost: (id: any) => Promise<AxiosResponse<unknown>>;
  let createPost: (
    data: Omit<CreatePostDto, 'authorId'>
  ) => Promise<AxiosResponse<unknown>>;
  let updatePost: (
    id: string,
    data: Omit<UpdatePostDto, 'userId' | 'postId'>
  ) => Promise<AxiosResponse<unknown>>;
  let deletePost: (id: string) => Promise<AxiosResponse<unknown>>;
  let getPostsMetadata: () => Promise<AxiosResponse<unknown>>;

  let users: User[] = [];
  let posts: Post[] = [];
  let tags: Tag[] = [];

  let admin: User;
  let author: User;
  let user: User;

  let PUBLISHED_PUBLIC_POSTS_NUM: number;
  let DRAFT_POSTS_NUM: number;
  let PUBLISHED_MEMBERS_ONLY_POSTS_NUM: number;

  const testData = {
    publicOnlyTags: [] as Tag[],
    privateAdminTags: [] as Tag[],
    privateAuthorTags: [] as Tag[],
    privateAuthorTags_AlsoUsedOnPublic: [] as Tag[], // Used in both public and private posts
    privateAdminTags_AlsoUsedOnPublic: [] as Tag[], // Used in both public and private posts
  };

  beforeAll(async () => {
    users = await seedUsers();
    posts = await seedPosts();
    tags = await seedTags();

    PUBLISHED_PUBLIC_POSTS_NUM = posts.filter(
      (p) => p.visibility === 'PUBLIC' && p.status === 'PUBLISHED'
    ).length;
    DRAFT_POSTS_NUM = posts.filter((p) => p.status === 'DRAFT').length;
    PUBLISHED_MEMBERS_ONLY_POSTS_NUM = posts.filter(
      (p) => p.visibility === 'MEMBERS_ONLY' && p.status === 'PUBLISHED'
    ).length;

    if (
      !PUBLISHED_PUBLIC_POSTS_NUM ||
      !DRAFT_POSTS_NUM ||
      !PUBLISHED_MEMBERS_ONLY_POSTS_NUM
    )
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
      TAG_RANGES.PUBLIC_ONLY.end
    );
    testData.privateAdminTags = tags.slice(
      TAG_RANGES.PRIVATE_ADMIN.start,
      TAG_RANGES.PRIVATE_ADMIN.end
    );
    testData.privateAuthorTags = tags.slice(
      TAG_RANGES.PRIVATE_AUTHOR.start,
      TAG_RANGES.PRIVATE_AUTHOR.end
    );
    testData.privateAuthorTags_AlsoUsedOnPublic = tags.slice(
      TAG_RANGES.PRIVATE_AND_PUBLIC_AUTHOR.start,
      TAG_RANGES.PRIVATE_AND_PUBLIC_AUTHOR.end
    );
    testData.privateAdminTags_AlsoUsedOnPublic = tags.slice(
      TAG_RANGES.PRIVATE_AND_PUBLIC_ADMIN.start,
      TAG_RANGES.PRIVATE_AND_PUBLIC_ADMIN.end
    );

    admin = users.find((u) => u.role === 'ADMIN') as User;
    author = users.find((u) => u.role === 'AUTHOR') as User;
    user = users.find((u) => u.role === 'USER') as User;

    if (!admin || !author || !user) throw new Error('Missing users');

    // Organize posts by type
    const postsByType = {
      published: posts.filter((p) => p.status === 'PUBLISHED'),
      privateAdmin: posts.filter(
        (p) => p.status !== 'PUBLISHED' && p.authorId === admin.id
      ),
      privateAuthor: posts.filter(
        (p) => p.status !== 'PUBLISHED' && p.authorId === author.id
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
            tagGroup.map((t) => t.id)
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
  });

  beforeEach(() => {
    client = createAxiosClient();
    ({ login } = createAuthRouteHelper(client));
    ({
      getPosts,
      getPost,
      createPost,
      updatePost,
      deletePost,
      getTags,
      getPostsMetadata,
    } = createPostsRouteHelper(client));
  });

  describe('GET /api/v1/posts/:id', () => {
    it('should return post data for PUBLIC and PUBLISHED posts', async () => {
      const publishedPost = posts.find(
        (p) => p.status === 'PUBLISHED' && p.visibility === 'PUBLIC'
      );
      if (!publishedPost) throw new Error('Missing published test post');

      const res = await getPost(publishedPost.id.toString());
      const { data } = res.data as BaseResponse;

      expect(data).toHaveProperty('message', SUCCESS_MESSAGES.POSTS.get);

      const postData = (data as any).post as Post;
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
        (p) => p.status === 'PUBLISHED' && p.visibility === 'PUBLIC'
      );
      if (!publicPost) throw new Error('Missing test post');

      const res = await getPost(publicPost.id.toString());
      const { data } = res.data as BaseResponse;

      const postData = (data as any).post as Post;
      expect((postData as any).tags.length).toBe(expectedTags.length);

      for (const tag of expectedTags)
        expect((postData as any).tags.includes(tag.name)).toBe(true);
    });

    test.each([
      ['masked when not logged in', false],
      ['shown when logged in', true],
    ])(
      'should return MEMBERS_ONLY posts with content %s',
      async (_, isLoggedIn) => {
        const membersOnlyPost = posts.find(
          (p) => p.status === 'PUBLISHED' && p.visibility === 'MEMBERS_ONLY'
        );
        if (!membersOnlyPost) throw new Error('Missing published test post');

        if (isLoggedIn) await login(users[0].email, users[0].password);

        const res = await getPost(membersOnlyPost.id);
        const { data } = res.data as BaseResponse;

        expect(data).toHaveProperty('message', SUCCESS_MESSAGES.POSTS.get);

        const postData = (data as any).post as Post;
        expect(postData.id).toBe(membersOnlyPost.id);
        expect(postData.title).toBe(membersOnlyPost.title);
        expect(postData.content).toBe(
          isLoggedIn
            ? membersOnlyPost.content
            : VALIDATION_MESSAGES.posts.membersOnly
        );
      }
    );

    test.each([
      ['is letter', 'a'],
      ['is special character', '@'],
      ['is decimal number', '12.34'],
      ['is negative number', '-5'],
      ['is boolean true', 'true'],
      ['is boolean false', 'false'],
      ['is null string', 'null'],
      ['is undefined string', 'undefined'],
    ])('should return validation error when id %s', async (_, id) => {
      await expect(getPost(id as any)).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.VALIDATION.VALIDATION_ERROR)
      );
    });

    it('should return 404 NOT FOUND for unknown post id', async () => {
      return await expect(getPost(999)).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.NOT_FOUND)
      );
    });

    it('should return 403 FORBIDDEN for DRAFT or ARCHIVED post of another user', async () => {
      const archivedPostOfAnotherUser = posts.find(
        (p) => p.status === 'ARCHIVED' && p.authorId !== author.id
      );
      const draftPostOfAnotherUser = posts.find(
        (p) => p.status === 'DRAFT' && p.authorId !== author.id
      );
      if (!archivedPostOfAnotherUser || !draftPostOfAnotherUser)
        throw new Error('Missing test posts');

      // Not logged in
      for (const id of [
        archivedPostOfAnotherUser.id,
        draftPostOfAnotherUser.id,
      ])
        await expect(getPost(id)).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.SERVER.FORBIDDEN)
        );

      await login(author.email, author.password);

      // Logged in as another user
      for (const id of [
        archivedPostOfAnotherUser.id,
        draftPostOfAnotherUser.id,
      ])
        await expect(getPost(id)).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.SERVER.FORBIDDEN)
        );
    });

    test.each(['ADMIN', 'MOD'])(
      'should allow access to DRAFT or ARCHIVED posts of another user when %s',
      async (role) => {
        const archivedPostOfAnotherUser = posts.find(
          (p) => p.status === 'ARCHIVED' && p.authorId !== admin.id
        );
        const draftPostOfAnotherUser = posts.find(
          (p) => p.status === 'DRAFT' && p.authorId !== admin.id
        );
        if (!archivedPostOfAnotherUser || !draftPostOfAnotherUser)
          throw new Error('Missing test posts');

        const user = users.find((u) => u.role === role);
        if (!user) throw new Error('Missing test user');

        await login(user.email, user.password);

        for (const id of [
          archivedPostOfAnotherUser.id,
          draftPostOfAnotherUser.id,
        ]) {
          const res = await getPost(id);
          const { data } = res.data as BaseResponse;

          expect(data).toHaveProperty('message', SUCCESS_MESSAGES.POSTS.get);

          const postData = (data as any).post as Post;
          expect(postData.id).toBe(id);
        }
      }
    );
  });

  describe('GET /api/v1/posts', () => {
    describe('Guest User (Not Authenticated)', () => {
      it(`should retrieve only PUBLIC-PUBLISHED and 
    MEMBERS_ONLY-PUBLISHED posts by default`, async () => {
        const res = await getPosts();
        const { data } = res.data as BaseResponse;

        expect(data).toHaveProperty('message', SUCCESS_MESSAGES.POSTS.getAll);

        const postsData = data as GetPostsResponseDto;
        expect(postsData).toBeDefined();

        const expectedTotal =
          PUBLISHED_PUBLIC_POSTS_NUM + PUBLISHED_MEMBERS_ONLY_POSTS_NUM;
        const expectedPages = Math.ceil(
          (PUBLISHED_PUBLIC_POSTS_NUM + PUBLISHED_MEMBERS_ONLY_POSTS_NUM) /
            PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE
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

        expect(postsData.count).toBe(PUBLISHED_MEMBERS_ONLY_POSTS_NUM);
        expect(postsData.items).toHaveLength(PUBLISHED_MEMBERS_ONLY_POSTS_NUM);
        expect(
          postsData.items.every(
            (p) => p.content === VALIDATION_MESSAGES.posts.membersOnly
          )
        );
      });

      it('should return posts with their associated tags included', async () => {
        const res = await getPosts();

        const { data } = res.data as BaseResponse;
        const postsData = data as GetPostsResponseDto;

        for (const post of postsData.items)
          expect((post as any).tags.length).toBeGreaterThan(0);
      });

      it('should allow filtering by tag name', async () => {
        const res = await getPosts({
          filterBy: {
            tags: [...testData.publicOnlyTags.map((t) => t.name)],
          },
        });

        const { data } = res.data as BaseResponse;
        const postsData = data as GetPostsResponseDto;

        expect(postsData.pagination.total).toBe(
          PUBLISHED_PUBLIC_POSTS_NUM + PUBLISHED_MEMBERS_ONLY_POSTS_NUM
        );
        for (const post of postsData.items)
          expect(
            (post as any).tags.some((name: string) =>
              testData.publicOnlyTags.map((t) => t.name).includes(name)
            )
          ).toBe(true);
      });

      it('should allow filtering by publishedDate year', async () => {
        const uniqueYears = [
          ...new Set(
            posts
              .filter((p) => p.publishedAt)
              .map((p) => new Date(p.publishedAt ?? '').getFullYear())
          ),
        ];
        if (uniqueYears.length < 2)
          throw new Error('Need more test posts for different published years');

        for (const year of uniqueYears) {
          const res = await getPosts({
            filterBy: {
              year,
            },
          });

          const { data } = res.data as BaseResponse;
          const postsData = data as GetPostsResponseDto;

          for (const post of postsData.items)
            if (post.publishedAt) {
              const postYear = new Date(post.publishedAt).getFullYear();
              expect(postYear).toBe(year);
            }
        }
      });

      it(`should not show other users' private posts that contain those tags`, async () => {
        const res = await getPosts({
          filterBy: {
            tags: [...testData.privateAuthorTags.map((t) => t.name)],
          },
        });
        const { data } = res.data as BaseResponse;
        const postsData = data as GetPostsResponseDto;

        expect(postsData.count).toBe(0);
      });

      test.each([
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
            getPosts({
              filterBy: {
                tags: [tag],
              },
            })
          ).rejects.toMatchObject(
            createErrorCodeResponse(ERROR_CODES.VALIDATION.VALIDATION_ERROR)
          );
        }
      );
    });

    describe('?sortBy[x]=y', () => {
      test.each([
        ['option does not exist', 'modifiedAt', 'asc'],
        ['option exists, but wrong value', 'createdAt', 'descending'],
        ['option exists, but value is empty', 'createdAt', ''],
        ['option exists, but value is wrong case', 'createdAt', 'DESC'],
      ])(
        'should return validation error when sortBy %s',
        async (_, key, value) => {
          return await expect(
            getPosts({
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
        ['published date (ASC)', 'publishedAt', false],
        ['published date (DESC)', 'publishedAt', true],
        ['created date (ASC)', 'createdAt', false],
        ['created date (DESC)', 'createdAt', true],
        ['updated date (ASC)', 'updatedAt', false],
        ['updated date (DESC)', 'updatedAt', true],
      ])(
        'should sort items provided that sorting by %s is applied',
        async (_, propName, isDescending: boolean) => {
          const res = await getPosts({
            sortBy: {
              [propName]: isDescending ? 'desc' : 'asc',
            },
          });

          const { data } = res.data as BaseResponse;
          const postsData = data as GetPostsResponseDto;

          const sortedItems = [...postsData.items].sort((prev, next) => {
            if (!prev[propName] || !next[propName]) return 0;
            const prevDate = new Date(prev[propName]).getTime();
            const nextDate = new Date(next[propName]).getTime();
            return isDescending ? nextDate - prevDate : prevDate - nextDate;
          });

          sortedItems.forEach((post, i) => {
            expect(post.id).toBe(postsData.items[i].id);
          });
        }
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
        const res = await getPosts({
          pageOffset: offset,
        });
        const { data } = res.data as BaseResponse;
        const postsData = data as GetPostsResponseDto;

        expect(postsData.count).toBe(defaultPageSize);
        expect(postsData.items.length).toBe(defaultPageSize);
        expect(postsData.pagination.page).toBe(offset / defaultPageSize + 1);
      });

      it('should return 0 items when offset is beyond total number of posts', async () => {
        const res = await getPosts({
          pageOffset: totalNumberOfPosts,
          pageSize: pageSizeOptions[2],
        });
        const { data } = res.data as BaseResponse;
        const postsData = data as GetPostsResponseDto;

        expect(postsData.pagination.page).toBe(
          Math.ceil(totalNumberOfPosts / pageSizeOptions[2]) + 1
        );
        expect(postsData.count).toBe(0);
        expect(postsData.items.length).toBe(0);
      });

      test.each([
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
          const res = await getPosts({
            pageOffset,
            pageSize,
          });
          const { data } = res.data as BaseResponse;
          const postsData = data as GetPostsResponseDto;

          expect(postsData.pagination.page).toBe(expectedPageNum);
          expect(postsData.pagination.total).toBe(totalNumberOfPosts);
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
      ])('should return validation error when %s', async (_, params) => {
        await expect(getPosts(params)).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.VALIDATION.VALIDATION_ERROR)
        );
      });
    });

    describe('Authenticated Author', () => {
      test.each([
        ['DRAFT and ARCHIVED posts', ['ARCHIVED', 'DRAFT'] as PostStatus[]],
        ['DRAFT posts', ['DRAFT'] as PostStatus[]],
        ['ARCHIVED posts', ['ARCHIVED'] as PostStatus[]],
      ])(
        'should retrieve their own private %s when filtering by status',
        async (_, allowedPostStatus) => {
          const filteredPosts = posts.filter(
            (p) =>
              allowedPostStatus.includes(p.status) && p.authorId === author.id
          );

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
            expect(post.authorId).toBe(author.id);
            expect(allowedPostStatus).toContain(post.status);
          });
        }
      );

      it(`should retrieve own private posts when author is logged in and filtering by tags`, async () => {
        await login(author.email, author.password);
        const res = await getPosts({
          filterBy: {
            tags: [
              ...testData.privateAuthorTags_AlsoUsedOnPublic.map((t) => t.name),
            ],
          },
        });
        const { data } = res.data as BaseResponse;
        const postsData = data as GetPostsResponseDto;

        for (const post of postsData.items) {
          if (post.status !== 'PUBLISHED')
            expect(post.authorId).toBe(author.id);

          for (const tag of (post as any).tags)
            expect(
              testData.privateAuthorTags_AlsoUsedOnPublic
                .map((t) => t.name)
                .includes(tag)
            ).toBe(true);
        }
      });

      it(`should retrieve own private posts when user is logged in and filtering by year`, async () => {
        const expectedYear = posts
          .find((p) => p.authorId === author.id && p.publishedAt)
          ?.publishedAt?.getFullYear();

        await login(author.email, author.password);

        const res = await getPosts({
          filterBy: {
            year: expectedYear,
          },
        });
        const { data } = res.data as BaseResponse;
        const postsData = data as GetPostsResponseDto;

        for (const post of postsData.items) {
          if (post.publishedAt) {
            const postYear = new Date(post.publishedAt).getFullYear();
            expect(postYear).toBe(expectedYear);
          }

          if (post.status !== 'PUBLISHED')
            expect(post.authorId).toBe(author.id);
        }
      });

      it(`should retrieve all private user posts when logged in as ADMIN`, async () => {
        await login(admin.email, admin.password);

        const res = await getPosts({
          pageSize: PAGINATION.POSTS.ITEMS_PER_PAGE_OPTIONS[2],
          filterBy: {
            status: ['DRAFT', 'ARCHIVED'],
          },
        });

        const { data } = res.data as BaseResponse;
        const postsData = data as GetPostsResponseDto;

        expect(
          postsData.items.some(
            (p) => p.status !== 'PUBLISHED' && p.authorId !== admin.id
          )
        ).toBe(true);
      });

      test.each([
        { visibility: ['PUBLIC'] },
        { status: ['PUBLISHED'], visibility: ['PUBLIC'] },
        { status: ['DRAFT'], visibility: ['PUBLIC'] },
        { status: ['DRAFT'] },
        { status: ['ARCHIVED'] },
        { visibility: ['PUBLIC'] },
        { visibility: ['MEMBERS_ONLY'] },
        { status: [] },
      ])(
        'should find his own posts w/wo filters and a search query specified',
        async (filters) => {
          const expectedPost = posts.find(
            (p) =>
              p.authorId === author.id &&
              (!filters?.status?.length || filters.status.includes(p.status)) &&
              (!filters?.visibility?.length ||
                filters.visibility.includes(p.visibility))
          );
          if (!expectedPost) throw new Error('Missing private post');

          const res = await getPosts({
            viewerId: author.id,
            filterBy: filters,
            searchQuery: expectedPost.title.substring(5),
          });

          const { data } = res.data as BaseResponse;
          const postsData = data as GetPostsResponseDto;

          expect(postsData.count).toBe(1);
          expect(postsData.items[0].id).toBe(expectedPost.id);
        }
      );

      it(`should not retrieve other users drafts and 
      archived posts when overlapping tags are present`, async () => {
        await login(author.email, author.password);
        const res = await getPosts({
          filterBy: {
            tags: [
              ...testData.privateAdminTags.map((t) => t.name),
              ...testData.privateAuthorTags.map((t) => t.name),
            ],
          },
        });
        const { data } = res.data as BaseResponse;
        const postsData = data as GetPostsResponseDto;

        for (const post of postsData.items) {
          if (post.status !== 'PUBLISHED')
            expect(post.authorId).toBe(author.id);

          for (const tag of (post as any).tags)
            expect(
              testData.privateAuthorTags_AlsoUsedOnPublic
                .map((t) => t.name)
                .includes(tag)
            ).toBe(true);
        }
      });
    });

    describe('GET /api/v1/posts - Authenticated Non-Author', () => {
      test.each([[['DRAFT']], [['ARCHIVED']], [['DRAFT', 'ARCHIVED']]])(
        'should not retrieve other users %j posts',
        async (allowedPostStatus) => {
          await login(user.email, user.password);

          const res = await getPosts({
            filterBy: {
              status: allowedPostStatus,
            },
          });

          const { data } = res.data as BaseResponse;
          const postsData = data as GetPostsResponseDto;

          // Should only see their own drafts, if any
          postsData.items.forEach((post) => {
            expect(post.authorId).toBe(user.id);
          });
        }
      );

      it(`should not retrieve other users drafts and 
      archived posts when search query is present`, async () => {
        const privatePostFromAnotherAuthor = posts.find(
          (p) =>
            (p.status === 'DRAFT' || p.status === 'ARCHIVED') &&
            p.authorId !== user.id
        );
        if (!privatePostFromAnotherAuthor)
          throw new Error('Missing post by other user');

        await login(user.email, user.password);

        const resWithFilters = await getPosts({
          searchQuery: privatePostFromAnotherAuthor.title,
        });

        const { data } = resWithFilters.data as BaseResponse;
        const postsData = data as GetPostsResponseDto;
        expect(postsData.count).toBe(0);
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
        title: generateRandomString(POST_CONSTRAINTS.MIN_TITLE_LENGTH + 1),
      },
      {
        ...VALID_POST_DATA,
        title: generateRandomString(POST_CONSTRAINTS.MIN_TITLE_LENGTH + 1),
        isDraft: false,
      },
      {
        ...VALID_POST_DATA,
        title: generateRandomString(POST_CONSTRAINTS.MIN_TITLE_LENGTH + 1),
        isMembersOnly: true,
      },
    ])(
      'should create a post if post data is valid and logged in user is either ADMIN or AUTHOR',
      async (postData) => {
        const user = [admin, author][Math.floor(Math.random() * 2)];

        await login(user.email, user.password);

        const res = await createPost(postData);
        const { data } = res.data as BaseResponse;

        expect(data).toHaveProperty('message', SUCCESS_MESSAGES.POSTS.create);
        const post = (data as any).post as Post;

        expect(post).toBeDefined();
        expect(post.title).toBe(postData.title);
        expect(post.authorId).toBe(user.id);
        expect(post.status).toBe(postData.isDraft ? 'DRAFT' : 'PUBLISHED');
        expect(post.visibility).toBe(
          postData.isMembersOnly ? 'MEMBERS_ONLY' : 'PUBLIC'
        );
        // Should set published date when post is PUBLISHED
        if (postData.isDraft) expect(post.publishedAt).toBe(null);
        else expect(post.publishedAt).toBeTruthy();
      }
    );

    it('should create tags if new names are specified in post data', async () => {
      const uniqueTags = Array.from({ length: 3 }).map(() =>
        generateRandomString(10, {
          includeSymbols: false,
          includeUppercase: false,
        })
      );

      await login(author.email, author.password);

      const res = await createPost({
        ...VALID_POST_DATA,
        title: generateRandomString(POST_CONSTRAINTS.MAX_TITLE_LENGTH - 1),
        tags: [...uniqueTags],
      });
      const { data } = res.data as BaseResponse;
      const post = (data as any).post as Post;

      for (const tag of uniqueTags)
        expect((post as any).tags.includes(tag)).toBe(true);

      const res_tags = await getTags();

      const { data: tags_data } = res_tags.data as BaseResponse;

      const { items } = tags_data as GetTagsResponse;
      for (const tag of uniqueTags)
        expect(items.map((t) => t.name).includes(tag)).toBe(true);
    });

    it('should assign tags if existing tags are specified', async () => {
      await login(author.email, author.password);

      const res = await createPost({
        ...VALID_POST_DATA,
        title: generateRandomString(POST_CONSTRAINTS.MAX_TITLE_LENGTH - 1),
        tags: [...testData.publicOnlyTags.map((t) => t.name)],
      });
      const { data } = res.data as BaseResponse;
      const post = (data as any).post as Post;

      for (const tag of testData.publicOnlyTags.map((t) => t.name))
        expect((post as any).tags.includes(tag)).toBe(true);
    });

    test.each([
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
            POST_CONSTRAINTS.MAX_CONTENT_LENGTH + 1
          ),
        },
      ],
      [
        'content is too short',
        {
          ...VALID_POST_DATA,
          content: generateRandomString(
            POST_CONSTRAINTS.MIN_CONTENT_LENGTH - 1
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
      await login(admin.email, admin.password);
      return await expect(createPost(postData as any)).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.VALIDATION.VALIDATION_ERROR)
      );
    });

    it(`should return 403 FORBIDDEN, when user creating the post is not ADMIN or AUTHOR`, async () => {
      await login(user.email, user.password);

      return await expect(
        createPost({
          ...VALID_POST_DATA,
          title: generateRandomString(POST_CONSTRAINTS.MIN_TITLE_LENGTH + 1),
        })
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.FORBIDDEN)
      );
    });

    it('should return validation error when creating a post with the same title', async () => {
      await login(author.email, author.password);

      const existingPostTitle = posts[0].title;

      return await expect(
        createPost({
          ...VALID_POST_DATA,
          title: existingPostTitle,
        })
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.VALIDATION.POST_EXISTS)
      );
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

        await login(author.email, author.password);

        const res = await updatePost(postForUpdate.id.toString(), {
          [propName]: value,
        } as any);
        const { data } = res.data as BaseResponse;

        expect(data).toHaveProperty('message', SUCCESS_MESSAGES.POSTS.update);
        const post = (data as any).post as Post;

        expect(post).toBeDefined();
        expect(post.id).toBe(postForUpdate.id);
        expect(post[propName]).toBe(value);
        // Expect updatedAt date to change
        expect(postForUpdate.updatedAt.getTime()).toBeLessThan(
          new Date(post.updatedAt).getTime()
        );
      }
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

        await login(admin.email, admin.password);

        const res = await updatePost(postForUpdate.id.toString(), {
          [propName]: value,
        } as any);
        const { data } = res.data as BaseResponse;

        const post = (data as any).post as Post;

        expect(post).toBeDefined();
        expect(post.id).toBe(postForUpdate.id);
        expect(post[propName]).toBe(value);
        // Expect updatedAt date to change
        expect(postForUpdate.updatedAt.getTime()).toBeLessThan(
          new Date(post.updatedAt).getTime()
        );
      }
    );

    it('should set publishedAt date when post status is updated from DRAFT to PUBLISHED', async () => {
      const postForUpdate = posts.find(
        (p) => p.status === 'DRAFT' && p.authorId === author.id
      );
      if (!postForUpdate) throw new Error('Missing test post');
      expect(postForUpdate.publishedAt).toBeFalsy();

      await login(author.email, author.password);

      const res = await updatePost(postForUpdate.id.toString(), {
        status: 'PUBLISHED',
      } as any);

      const { data } = res.data as BaseResponse;
      const post = (data as any).post as Post;

      expect(post.publishedAt).toBeTruthy();
    });

    test.each([
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
            POST_CONSTRAINTS.MAX_CONTENT_LENGTH + 1
          ),
        },
      ],
      [
        'content is too short',
        {
          content: generateRandomString(
            POST_CONSTRAINTS.MIN_CONTENT_LENGTH - 1
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
    ])('should return validation error when %s', async (_, postData) => {
      const postForUpdate = posts.find((p) => p.authorId === author.id);
      if (!postForUpdate) throw new Error('Missing test post');

      await login(author.email, author.password);
      return await expect(
        updatePost(postForUpdate.id.toString(), postData as any)
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.VALIDATION.VALIDATION_ERROR)
      );
    });

    it('should return 404 NOT FOUND when post for update does not exist', async () => {
      await login(author.email, author.password);
      return await expect(
        updatePost('999', {
          content: 'NEW post content',
        } as any)
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.NOT_FOUND)
      );
    });

    it(`should return 403 FORBIDDEN when the user is not ADMIN or AUTHOR`, async () => {
      const nonAdminOrAuthorUsers = users.filter(
        (u) => !(u.role === 'ADMIN' || u.role === 'AUTHOR')
      );

      for (const u of nonAdminOrAuthorUsers) {
        await login(u.email, u.password);

        await expect(
          updatePost('1', {
            content: generateRandomString(
              POST_CONSTRAINTS.MIN_CONTENT_LENGTH + 1
            ),
          })
        ).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.SERVER.FORBIDDEN)
        );
      }
    });

    it(`should return 403 FORBIDDEN for authors, 
      when trying to update another author's post`, async () => {
      const postForUpdateFromAnotherUser = posts.find(
        (p) => p.authorId === admin.id
      );
      if (!postForUpdateFromAnotherUser) throw new Error('Missing test post');

      await login(author.email, author.password);

      await expect(
        updatePost(postForUpdateFromAnotherUser.id.toString(), {
          content: generateRandomString(
            POST_CONSTRAINTS.MIN_CONTENT_LENGTH + 1
          ),
        })
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.FORBIDDEN)
      );
    });

    it('should create tags if new names are specified in update post data', async () => {
      const postForUpdate = posts.find((p) => p.authorId === author.id);
      if (!postForUpdate) throw new Error('Missing test post');
      const uniqueTags = Array.from({ length: 3 }).map(() =>
        generateRandomString(10, {
          includeSymbols: false,
          includeUppercase: false,
        })
      );

      await login(author.email, author.password);

      const res = await updatePost(postForUpdate.id.toString(), {
        tags: [...uniqueTags],
      });
      const { data } = res.data as BaseResponse;
      const post = (data as any).post as Post;

      for (const tag of uniqueTags)
        expect((post as any).tags.includes(tag)).toBe(true);

      const res_tags = await getTags();

      const { data: tags_data } = res_tags.data as BaseResponse;

      const { items } = tags_data as GetTagsResponse;
      for (const tag of uniqueTags)
        expect(items.map((t) => t.name).includes(tag)).toBe(true);
    });

    it('should assign and overwrite post tags if existing tags are specified', async () => {
      const postForUpdate = posts.find((p) => p.authorId === author.id);
      if (!postForUpdate) throw new Error('Missing test post');

      await login(author.email, author.password);

      const res = await updatePost(postForUpdate.id.toString(), {
        tags: [...testData.publicOnlyTags.map((t) => t.name)],
      });
      const { data } = res.data as BaseResponse;
      const post = (data as any).post as Post;

      for (const tag of testData.publicOnlyTags.map((t) => t.name))
        expect((post as any).tags.includes(tag)).toBe(true);
    });

    it(`should return validation error when updating a
      post title to be the same as another one`, async () => {
      const postForUpdate = posts.find((p) => p.authorId === admin.id);
      if (!postForUpdate) throw new Error('Missing test post');

      await login(admin.email, admin.password);

      const anotherPost = posts.find((p) => p.id !== postForUpdate.id);
      if (!anotherPost) throw new Error('Missing test post');

      const existingPostTitle = anotherPost.title;

      return await expect(
        updatePost(postForUpdate.id.toString(), {
          title: existingPostTitle,
        })
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.VALIDATION.POST_EXISTS)
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
    ])('should return validation error when id %s', async (_, id) => {
      await login(admin.email, admin.password);
      await expect(updatePost(id as any, {})).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.VALIDATION.VALIDATION_ERROR)
      );
    });
  });

  describe('DELETE /api/v1/posts/:id', () => {
    afterAll(async () => {
      posts = await seedPosts();
    });

    const deletedIds: number[] = [];

    it('should remove post when its authenticated author is requesting it', async () => {
      const postForDeletion = posts.find(
        (p) => p.authorId === author.id && !deletedIds.includes(p.id)
      );
      if (!postForDeletion) throw new Error('Missing test post');

      await login(author.email, author.password);

      const deleteRes = await deletePost(postForDeletion.id.toString());
      expect(deleteRes.status).toBe(StatusCodes.OK);
      const { data } = deleteRes.data as BaseResponse;

      expect(data).toHaveProperty('message', SUCCESS_MESSAGES.POSTS.delete);

      deletedIds.push(postForDeletion.id);

      await expect(
        deletePost(postForDeletion.id.toString())
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.NOT_FOUND)
      );
    });

    it(`should return 404 NOT FOUND when trying to delete post that does not exist`, async () => {
      await login(admin.email, admin.password);
      await expect(deletePost('999')).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.NOT_FOUND)
      );
    });

    it(`should return 403 FORBIDDEN when trying to delete another user's post`, async () => {
      const postForDeletionFromAnotherUser = posts.find(
        (p) => p.authorId === admin.id && !deletedIds.includes(p.id)
      );
      if (!postForDeletionFromAnotherUser) throw new Error('Missing test post');

      await login(author.email, author.password);
      await expect(
        deletePost(postForDeletionFromAnotherUser.id.toString())
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.FORBIDDEN)
      );
    });

    it(`should allow deletion of another user's post when logged in user is ADMIN`, async () => {
      const postForDeletionFromAnotherUser = posts.find(
        (p) => p.authorId === author.id && !deletedIds.includes(p.id)
      );
      if (!postForDeletionFromAnotherUser) throw new Error('Missing test post');

      await login(admin.email, admin.password);
      const deleteRes = await deletePost(
        postForDeletionFromAnotherUser.id.toString()
      );

      expect(deleteRes.status).toBe(StatusCodes.OK);

      const { data } = deleteRes.data as BaseResponse;
      expect(data).toHaveProperty('message', SUCCESS_MESSAGES.POSTS.delete);
    });

    it('deleting the last post referencing created tags should delete them also', async () => {
      await login(author.email, author.password);

      const persistentTags = [
        'tag-that-wont-be-deleted-1',
        'tag-that-wont-be-deleted-2',
      ];

      const res = await createPost({
        content: generateRandomString(10),
        title: generateRandomString(10),
        tags: persistentTags,
        isDraft: false,
        isMembersOnly: false,
      });

      const { data } = res.data as BaseResponse;
      const postWithTagsForDeletion = (data as any).post as Post;

      for (const tag of persistentTags)
        expect((postWithTagsForDeletion as any).tags.includes(tag)).toBe(true);

      await deletePost(postWithTagsForDeletion.id.toString());

      const res_tags = await getTags();

      const { data: tags_data } = res_tags.data as BaseResponse;

      const { count } = tags_data as GetTagsResponse;
      expect(count).toBe(0);
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
    ])('should return validation error when id %s', async (_, id) => {
      await login(admin.email, admin.password);
      return await expect(deletePost(id as any)).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.VALIDATION.VALIDATION_ERROR)
      );
    });
  });

  describe('GET /api/v1/posts/metadata', () => {
    it('should return all unique years for PUBLISHED posts', async () => {
      const expectedYears = posts
        .filter((p) => p.publishedAt && p.status === 'PUBLISHED')
        .map((p) => new Date(p.publishedAt!).getFullYear())
        .reduce(
          (acc, prev) => (acc.includes(prev) ? acc : [prev, ...acc]),
          [] as number[]
        );
      const res = await getPostsMetadata();
      const { data } = res.data as BaseResponse;
      expect(data).toHaveProperty(
        'message',
        SUCCESS_MESSAGES.POSTS.getMetadata
      );
      const { years } = data as GetPostsMetadataResponse;
      expect(years).toEqual(expect.arrayContaining(expectedYears));
      expect(years).toHaveLength(expectedYears.length);
    });

    it('does not include years with only non-published posts', async () => {
      const expectedYears = posts
        .filter((p) => p.publishedAt && p.status === 'PUBLISHED')
        .map((p) => new Date(p.publishedAt!).getFullYear())
        .reduce(
          (acc, prev) => (acc.includes(prev) ? acc : [prev, ...acc]),
          [] as number[]
        );

      const notExpectedYears = posts
        .filter((p) => p.publishedAt && p.status !== 'PUBLISHED')
        .map((p) => new Date(p.publishedAt!).getFullYear())
        .reduce(
          (acc, prev) => (acc.includes(prev) ? acc : [prev, ...acc]),
          [] as number[]
        )
        .filter((year) => !expectedYears.includes(year));

      const res = await getPostsMetadata();
      const { data } = res.data as BaseResponse;

      const { years } = data as GetPostsMetadataResponse;
      for (const year of notExpectedYears) {
        expect(years).not.toContain(year);
      }
    });
  });
});
