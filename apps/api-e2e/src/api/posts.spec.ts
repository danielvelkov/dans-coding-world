import { Post, PostStatus, User } from '@dans-coding-world/prisma-schema';
import { seedUsers, seedPosts } from '@dans-coding-world/testing-setup';
import { BaseResponse } from '@dans-coding-world/api-types';
import {
  ERROR_CODES,
  PAGINATION,
  POST_CONSTRAINTS,
  SUCCESS_MESSAGES,
  VALIDATION_MESSAGES,
} from '@dans-coding-world/shared-constants';
import { createAuthRouteHelper } from '../helper/auth-request.helper';
import { createAxiosClient } from '../helper/test-client.helper';
import { createPostsRouteHelper } from '../helper/posts-request.helper';
import {
  CreatePostDto,
  GetPostsResponseDto,
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

  let users: User[] = [];
  let posts: Post[] = [];

  let admin: User;

  let PUBLISHED_PUBLIC_POSTS_NUM: number;
  let DRAFT_POSTS_NUM: number;
  let PUBLISHED_MEMBERS_ONLY_POSTS_NUM: number;

  beforeAll(async () => {
    users = await seedUsers();
    posts = await seedPosts();

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
  });

  beforeEach(() => {
    client = createAxiosClient();
    ({ login } = createAuthRouteHelper(client));
    ({ getPosts, getPost, createPost, updatePost, deletePost } =
      createPostsRouteHelper(client));
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
      const user = users.find((u) => u.role === 'USER');
      if (!user) throw new Error('Missing test user');

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
          await expect(getPost(id)).rejects.toMatchObject(
            createErrorCodeResponse(ERROR_CODES.SERVER.FORBIDDEN)
          )
      );

      await login(user.email, user.password);

      // Logged in as another user
      [archivedPost.id, draftPost.id].forEach(
        async (id) =>
          await expect(getPost(id)).rejects.toMatchObject(
            createErrorCodeResponse(ERROR_CODES.SERVER.FORBIDDEN)
          )
      );
    });
  });

  describe('GET /api/v1/posts', () => {
    describe('GET /api/v1/posts - Guest User (Not Authenticated)', () => {
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
          hasNext: true,
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
    });

    describe('GET /api/v1/posts?sortBy[x]=y', () => {
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
        async (_, propName, isAscending: boolean) => {
          const res = await getPosts({
            sortBy: {
              [propName]: isAscending ? 'asc' : 'desc',
            },
          });

          const { data } = res.data as BaseResponse;
          const postsData = data as GetPostsResponseDto;

          const sortedItems = [...postsData.items].sort((prev, next) => {
            if (!prev[propName] || !next[propName]) return 0;
            const prevDate = new Date(prev[propName]).getTime();
            const nextDate = new Date(next[propName]).getTime();
            return isAscending ? prevDate - nextDate : nextDate - prevDate;
          });

          sortedItems.forEach((post, i) => {
            expect(post.id).toBe(postsData.items[i].id);
          });
        }
      );
    });

    describe('GET /api/v1/posts?pageOffset=x&pageSize=y', () => {
      const totalNumberOfPosts = 100;
      const pageSizeOptions = PAGINATION.POSTS.ITEMS_PER_PAGE_OPTIONS;
      const defaultPageSize = PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE;

      beforeAll(async () => {
        const posts = Array.from({ length: totalNumberOfPosts }).map((_, i) => {
          return {
            authorId: users[0].id,
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
      ])('should return validation error when %s', async (_, params) => {
        await expect(getPosts(params)).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.VALIDATION.VALIDATION_ERROR)
        );
      });
    });

    describe('GET /api/v1/posts - Authenticated Author', () => {
      test.each([
        ['DRAFT and ARCHIVED posts', ['ARCHIVED', 'DRAFT'] as PostStatus[]],
        ['DRAFT posts', ['DRAFT'] as PostStatus[]],
        ['ARCHIVED posts', ['ARCHIVED'] as PostStatus[]],
      ])(
        'should retrieve their own private %s when filtering by status',
        async (_, allowedPostStatus) => {
          const authorId = Math.floor(Math.random() * users.length) + 1;
          const filteredPosts = posts.filter(
            (p) =>
              allowedPostStatus.includes(p.status) && p.authorId === authorId
          );
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
          const author = users.find((u) => u.role === 'ADMIN');
          if (!author) throw new Error('Missing test author');

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

      it(`should not retrieve other users drafts and 
      archived posts when search query is present`, async () => {
        const regularUser = users.find((u) => u.role === 'USER');
        if (!regularUser) throw new Error('Missing regular user');

        const privatePostFromAnotherAuthor = posts.find(
          (p) =>
            (p.status === 'DRAFT' || p.status === 'ARCHIVED') &&
            p.authorId !== regularUser.id
        );
        if (!privatePostFromAnotherAuthor)
          throw new Error('Missing post by other user');

        await login(regularUser.email, regularUser.password);

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

    beforeAll(() => {
      admin = users.find((u) => u.role === 'ADMIN') as User;
      if (!admin) throw new Error('Missing test user');
    });

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
      'should create a post if post data is valid and logged in user is ADMIN',
      async (postData) => {
        await login(admin.email, admin.password);

        const res = await createPost(postData);
        const { data } = res.data as BaseResponse;

        expect(data).toHaveProperty('message', SUCCESS_MESSAGES.POSTS.create);
        const post = (data as any).post as Post;

        expect(post).toBeDefined();
        expect(post.title).toBe(postData.title);
        expect(post.authorId).toBe(admin.id);
        expect(post.status).toBe(postData.isDraft ? 'DRAFT' : 'PUBLISHED');
        expect(post.visibility).toBe(
          postData.isMembersOnly ? 'MEMBERS_ONLY' : 'PUBLIC'
        );
        // Should set published date when post is PUBLISHED
        if (postData.isDraft) expect(post.publishedAt).toBe(null);
        else expect(post.publishedAt).toBeTruthy();
      }
    );

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
    ])('should return validation error when %s', async (_, postData) => {
      await login(admin.email, admin.password);
      return await expect(createPost(postData as any)).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.VALIDATION.VALIDATION_ERROR)
      );
    });

    it(`should return 403 FORBIDDEN, when user creating the post is not ADMIN`, async () => {
      const user = users.find((u) => u.role === 'USER');
      if (!user) throw new Error('Missing test user');

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
      await login(admin.email, admin.password);

      const existingPostTitle = posts[0].title;

      return await expect(
        createPost({
          ...VALID_POST_DATA,
          title: existingPostTitle,
        })
      ).rejects.toMatchObject(
        createErrorCodeResponse(
          ERROR_CODES.VALIDATION.VALIDATION_ERROR,
          VALIDATION_MESSAGES.posts.titleAlreadyExists
        )
      );
    });
  });

  describe('PATCH /api/v1/posts/:id', () => {
    beforeAll(() => {
      admin = users.find((u) => u.role === 'ADMIN') as User;
      if (!admin) throw new Error('Missing test user');
    });

    test.each([
      [
        'content',
        generateRandomString(POST_CONSTRAINTS.MIN_CONTENT_LENGTH + 1),
      ],
      ['title', generateRandomString(POST_CONSTRAINTS.MIN_TITLE_LENGTH + 1)],
      ['status', 'ARCHIVED'],
      ['visibility', 'MEMBERS_ONLY'],
    ])(
      `should update a post's %s if logged in as author`,
      async (propName, value) => {
        const postForUpdate = posts.find((p) => p.authorId === admin.id);
        if (!postForUpdate) throw new Error('Missing test post');

        await login(admin.email, admin.password);

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

    it('should set publishedAt date when post status is updated from DRAFT to PUBLISHED', async () => {
      const postForUpdate = posts.find(
        (p) => p.status === 'DRAFT' && p.authorId === admin.id
      );
      if (!postForUpdate) throw new Error('Missing test post');
      expect(postForUpdate.publishedAt).toBeFalsy();

      await login(admin.email, admin.password);

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
    ])('should return validation error when %s', async (_, postData) => {
      const postForUpdate = posts.find((p) => p.authorId === admin.id);
      if (!postForUpdate) throw new Error('Missing test post');

      await login(admin.email, admin.password);
      return await expect(
        updatePost(postForUpdate.id.toString(), postData as any)
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.VALIDATION.VALIDATION_ERROR)
      );
    });

    it('should return 404 NOT FOUND when post for update does not exist', async () => {
      await login(admin.email, admin.password);
      return await expect(
        updatePost('999', {
          content: 'NEW post content',
        } as any)
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.NOT_FOUND)
      );
    });

    it(`should return 403 FORBIDDEN when non-admins are trying to update`, async () => {
      const nonAdminUsers = users.filter((u) => u.role !== 'ADMIN');

      for (const u of nonAdminUsers) {
        const postForUpdate = posts.find((p) => p.authorId === u.id);
        if (!postForUpdate) throw new Error('Missing test post');

        await login(u.email, u.password);

        await expect(
          updatePost(postForUpdate.id.toString(), {
            content: generateRandomString(
              POST_CONSTRAINTS.MIN_CONTENT_LENGTH + 1
            ),
          })
        ).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.SERVER.FORBIDDEN)
        );
      }
    });

    it(`should return 403 FORBIDDEN when trying to update another user's post`, async () => {
      const anotherUser = users.find((u) => u.id !== admin.id);
      if (!anotherUser) throw new Error('Missing test user');

      const postForUpdate = posts.find((p) => p.authorId === anotherUser.id);
      if (!postForUpdate) throw new Error('Missing test post');

      await login(admin.email, admin.password);

      await expect(
        updatePost(postForUpdate.id.toString(), {
          content: generateRandomString(
            POST_CONSTRAINTS.MIN_CONTENT_LENGTH + 1
          ),
        })
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.FORBIDDEN)
      );
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
        createErrorCodeResponse(
          ERROR_CODES.VALIDATION.VALIDATION_ERROR,
          VALIDATION_MESSAGES.posts.titleAlreadyExists
        )
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
    beforeAll(() => {
      admin = users.find((u) => u.role === 'ADMIN') as User;
      if (!admin) throw new Error('Missing test user');
    });

    afterAll(async () => {
      posts = await seedPosts();
    });

    it('should remove post when its authenticated author is requesting it', async () => {
      const postForDeletion = posts.find((p) => p.authorId === admin.id);
      if (!postForDeletion) throw new Error('Missing test post');

      await login(admin.email, admin.password);

      const deleteRes = await deletePost(postForDeletion.id.toString());
      expect(deleteRes.status).toBe(StatusCodes.OK);
      const { data } = deleteRes.data as BaseResponse;

      expect(data).toHaveProperty('message', SUCCESS_MESSAGES.POSTS.delete);

      await expect(deletePost(postForDeletion.id.toString())).rejects.toMatchObject(
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
      const postForDeletion = posts.find((p) => p.authorId !== admin.id);
      if (!postForDeletion) throw new Error('Missing test post');

      await login(admin.email, admin.password);
      await expect(
        deletePost(postForDeletion.id.toString())
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.FORBIDDEN)
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
      return await expect(deletePost(id as any)).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.VALIDATION.VALIDATION_ERROR)
      );
    });
  });
});
