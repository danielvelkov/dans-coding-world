/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';
import {
  POST_REPOSITORY_TOKEN,
  PostsService,
  USER_REPOSITORY_TOKEN,
} from './posts.service.js';
import {
  IPostRepository,
  IUserRepository,
} from '@dans-coding-world/shared-data-access-interfaces';
import {
  Post,
  PostOrderByInput,
  PostStatus,
  PostVisibility,
  PostWhereInput,
  User,
  client,
} from '@dans-coding-world/prisma-schema';
import { ReflectiveInjector } from 'injection-js';
import { IPostsService } from '../interfaces/posts-service.interface.js';
import {
  PrismaPostDataAccess as MockPostRepository,
  PostDetail,
} from '@dans-coding-world/post-data-access';
import { PrismaUserDataAccess as MockUserRepository } from '@dans-coding-world/user-data-access';
import {
  ERROR_CODES,
  ERROR_MESSAGES,
  PAGINATION,
  POST_CONSTRAINTS,
  TAG_CONSTRAINTS,
  VALIDATION_MESSAGES,
} from '@dans-coding-world/shared-constants';
import { getKey, generateRandomString } from '../helper/util.js';

let mockUsersRepo: IUserRepository;
let mockPostsRepo: IPostRepository<
  PostDetail,
  PostWhereInput,
  PostOrderByInput
>;
let injector: ReflectiveInjector;
let postsService: IPostsService;

describe('PostsService', () => {
  let user: User;
  let admin: User;
  let author: User;

  const validPostContent = {
    title: 'Very valid title',
    content: 'Very valid description',
    createdAt: new Date(),
    publishedAt: null,
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    await client.user.deleteMany();
    await client.tag.deleteMany();

    mockPostsRepo = new MockPostRepository();
    mockUsersRepo = new MockUserRepository();

    user = await mockUsersRepo.create({
      email: 'fakeUser123@gmail.com',
      password: 'fakeUserPass',
      username: 'fakeUser123',
      role: 'USER',
    });

    admin = await mockUsersRepo.create({
      email: 'fakeAdmin123@gmail.com',
      password: 'fakeAdminPass',
      username: 'fakeAdmin123',
      role: 'ADMIN',
    });

    author = await mockUsersRepo.create({
      email: 'fakeAuthor123@gmail.com',
      password: 'fakeAuthorPass',
      username: 'fakeAuthor123',
      role: 'AUTHOR',
    });

    injector = ReflectiveInjector.resolveAndCreate([
      PostsService,
      {
        provide: USER_REPOSITORY_TOKEN,
        useValue: mockUsersRepo,
      },
      {
        provide: POST_REPOSITORY_TOKEN,
        useValue: mockPostsRepo,
      },
    ]);
    postsService = injector.get(PostsService) as PostsService;

    jest.spyOn(mockPostsRepo, 'create');
    jest.spyOn(mockPostsRepo, 'update');
    jest.spyOn(mockPostsRepo, 'delete');
  });

  describe('getById()', () => {
    it('should return post if it is published and public', async () => {
      const createdPost = await mockPostsRepo.create({
        ...validPostContent,
        authorId: admin.id,
        status: 'PUBLISHED',
        visibility: 'PUBLIC',
      });

      const post = await postsService.getById({
        postId: createdPost.id,
      });

      expect(post).toBeTruthy();
      expect(createdPost.id).toEqual(post.id);
      expect(createdPost.content).not.toBe(
        VALIDATION_MESSAGES.posts.membersOnly
      );
    });

    it('should return post with tags field, if requested post has them', async () => {
      const expectedTags = ['tag-1', 'tag-2'];
      const createdPost = await mockPostsRepo.create({
        ...validPostContent,
        authorId: admin.id,
        status: 'PUBLISHED',
        visibility: 'PUBLIC',
        tags: expectedTags,
      });

      const post = await postsService.getById({
        postId: createdPost.id,
      });

      const postWithTags = post as PostDetail;

      expect(postWithTags.tags?.length).toBe(expectedTags.length);

      for (const tag of expectedTags)
        expect(postWithTags.tags?.includes(tag)).toBe(true);
    });

    it(`should return post with its content hidden, if it is members-only
       and no viewer id is provided`, async () => {
      const createdPost = await mockPostsRepo.create({
        ...validPostContent,
        authorId: admin.id,
        status: 'PUBLISHED',
        visibility: 'MEMBERS_ONLY',
      });

      const post = await postsService.getById({
        postId: createdPost.id,
      });

      expect(createdPost.id).toEqual(post.id);
      expect(post.content).toEqual(VALIDATION_MESSAGES.posts.membersOnly);
    });

    test.each([
      ['a draft', 'DRAFT' as PostStatus],
      ['archived', 'ARCHIVED' as PostStatus],
    ])(
      `should throw when the post is %s,
      and the user requesting it is not the author`,
      async (_, status) => {
        const createdPost = await mockPostsRepo.create({
          ...validPostContent,
          authorId: admin.id,
          status,
          visibility: 'PUBLIC',
        });

        expect.assertions(2);

        // Retrieve post when viewerId is author
        const post = await postsService.getById({
          postId: createdPost.id,
          viewerId: admin.id,
        });
        expect(post.id).toBe(createdPost.id);

        // Retrieve post as another user
        return postsService
          .getById({
            postId: createdPost.id,
            viewerId: user.id,
          })
          .catch((error) => {
            expect(error.message).toMatch(
              ERROR_MESSAGES[ERROR_CODES.SERVER.FORBIDDEN]
            );
          });
      }
    );

    it('should throw when post with this id does not exist', async () => {
      expect.assertions(1);
      return postsService.getById({ postId: 999 }).catch((error) => {
        expect(error.message).toMatch(
          ERROR_MESSAGES[ERROR_CODES.SERVER.NOT_FOUND]
        );
      });
    });

    test.each([
      ['is null', null],
      ['is undefined', undefined],
      ['is empty', ''],
    ])('should throw validation error when postId param %s', async (_, id) => {
      expect.assertions(1);
      return postsService.getById({ postId: id as any }).catch((error) => {
        expect(error.message).toMatch(
          ERROR_MESSAGES[ERROR_CODES.VALIDATION.VALIDATION_ERROR]
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
        const createdPost = await mockPostsRepo.create({
          ...validPostContent,
          authorId: admin.id,
          status: 'PUBLISHED',
          visibility: 'PUBLIC',
        });

        expect.assertions(1);
        return postsService
          .getById({
            postId: createdPost.id,
            viewerId: id as any,
          })
          .catch((error) => {
            expect(error.message).toMatch(
              ERROR_MESSAGES[ERROR_CODES.VALIDATION.VALIDATION_ERROR]
            );
          });
      }
    );
  });
  describe('getAll()', () => {
    const NUM_OF_PUBLIC_PUBLISHED_POSTS = 15;
    const NUM_OF_MEMBERS_ONLY_PUBLISHED_POSTS = 4;
    const NUM_OF_MEMBERS_ONLY_DRAFTS_POSTS = 3;
    const NUM_OF_ADMIN_DRAFTS_POSTS = 2;
    const NUM_OF_ADMIN_ARCHIVED_POSTS = 2;
    const NUM_OF_AUTHOR_DRAFTS_POSTS = 3;

    type PostWithTags = Post & { tags?: string[] };

    let posts: PostWithTags[] = [];
    const validTags = Array.from({ length: 10 }, (t, i) => `tag-${i}`);

    beforeEach(async () => {
      posts = [];

      await mockPostsRepo.deleteMany({});
      await client.tag.deleteMany({});

      for (let i = 0; i < NUM_OF_PUBLIC_PUBLISHED_POSTS; i++)
        posts.push(
          await mockPostsRepo.create({
            ...validPostContent,
            title: `PUBLIC & PUBLISHED: #${i}`,
            authorId: admin.id,
            status: 'PUBLISHED',
            visibility: 'PUBLIC',
            publishedAt: new Date(
              Date.now() + i * 1000 * 60 * 3 // 3 minutes between
            ),
          })
        );

      for (let i = 0; i < NUM_OF_MEMBERS_ONLY_PUBLISHED_POSTS; i++)
        posts.push(
          await mockPostsRepo.create({
            ...validPostContent,
            title: `MEMBERS_ONLY & PUBLISHED: #${i}`,
            authorId: admin.id,
            status: 'PUBLISHED',
            visibility: 'MEMBERS_ONLY',
            publishedAt: new Date(
              Date.now() + i * 1000 * 60 * 3 // 3 minutes between
            ),
          })
        );

      for (let i = 0; i < NUM_OF_MEMBERS_ONLY_DRAFTS_POSTS; i++)
        posts.push(
          await mockPostsRepo.create({
            ...validPostContent,
            title: `MEMBERS_ONLY & DRAFT: #${i}`,
            authorId: admin.id,
            status: 'DRAFT',
            visibility: 'MEMBERS_ONLY',
            publishedAt: new Date(
              Date.now() + i * 1000 * 60 * 3 // 3 minutes between
            ),
          })
        );

      for (let i = 0; i < NUM_OF_ADMIN_DRAFTS_POSTS; i++)
        posts.push(
          await mockPostsRepo.create({
            ...validPostContent,
            title: `DRAFT & PUBLIC: #${i}`,
            authorId: admin.id,
            status: 'DRAFT',
            visibility: 'PUBLIC',
            publishedAt: new Date(
              Date.now() + i * 1000 * 60 * 3 // 3 minutes between
            ),
          })
        );

      for (let i = 0; i < NUM_OF_ADMIN_ARCHIVED_POSTS; i++)
        posts.push(
          await mockPostsRepo.create({
            ...validPostContent,
            title: `ARCHIVED & PUBLIC: #${i}`,
            authorId: admin.id,
            status: 'ARCHIVED',
            visibility: 'PUBLIC',
            publishedAt: new Date(
              Date.now() + i * 1000 * 60 * 3 // 3 minutes between
            ),
          })
        );

      for (let i = 0; i < NUM_OF_AUTHOR_DRAFTS_POSTS; i++)
        posts.push(
          await mockPostsRepo.create({
            ...validPostContent,
            title: `DRAFT & PUBLIC: #${i}`,
            authorId: author.id,
            status: 'DRAFT',
            visibility: 'PUBLIC',
            publishedAt: new Date(
              Date.now() + i * 1000 * 60 * 3 // 3 minutes between
            ),
          })
        );

      // Add a random number of tags to each post
      for (const [i, val] of posts.entries()) {
        const shuffled = [...validTags].sort(() => 0.5 - Math.random());
        const tagNames = shuffled.slice(0, Math.floor(validTags.length / 2));

        await mockPostsRepo.update(val.id, { tags: tagNames });

        posts[i] = { ...val, tags: tagNames };
      }
    });

    test.each([
      ['negative page size', -1, 0],
      ['negative offset', 10, -1],
      ['floating point page size', 0.1, 0],
      ['floating point offset', 10, 2.5],
      ['string as page size', '0', 0],
      ['page size that is not allowed', 99, 0],
    ])('should throw when %s is set', async (_, pageSize, pageOffset) => {
      expect.assertions(1);
      // eslint-disable-next-line
      // @ts-ignore
      return postsService.getAll({ pageSize, pageOffset }).catch((error) => {
        expect(error.message).toMatch(
          ERROR_MESSAGES[ERROR_CODES.VALIDATION.VALIDATION_ERROR]
        );
      });
    });

    it('should return PUBLISHED posts by default', async () => {
      const resDto = await postsService.getAll();

      expect(resDto.pagination.total).toBe(
        NUM_OF_PUBLIC_PUBLISHED_POSTS + NUM_OF_MEMBERS_ONLY_PUBLISHED_POSTS
      );
      expect(resDto.items.length).toBe(resDto.count);

      // Default page when no offset provided is 1
      expect(resDto.pagination.page).toBe(1);
      expect(resDto.count).toBe(PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE);
    });

    it('should return associated tags alongside post data', async () => {
      const expectedPostsWithTags = posts.filter(
        (p) => p.status === 'PUBLISHED'
      );
      const resDto = await postsService.getAll();

      for (const post of resDto.items as PostWithTags[]) {
        const expectedPost = expectedPostsWithTags.find(
          (p) => p.id === post.id
        );
        expect(expectedPost?.tags?.length).toBe(post.tags?.length);
        if (!post.tags) throw new Error('Missing post tags');

        for (const tag of post.tags)
          expect(expectedPost?.tags?.includes(tag)).toBe(true);
      }
    });

    it(`should hide post content for members-only posts when no viewerId provided`, async () => {
      const resDto_WithoutViewerId = await postsService.getAll();
      resDto_WithoutViewerId.items
        .filter((p) => p.visibility === 'MEMBERS_ONLY')
        .every((p) =>
          expect(p.content).toBe(VALIDATION_MESSAGES.posts.membersOnly)
        );

      const resDto_WithViewerId = await postsService.getAll({
        viewerId: user.id,
      });
      resDto_WithViewerId.items
        .filter((p) => p.visibility === 'MEMBERS_ONLY')
        .every((p) =>
          expect(p.content).not.toBe(VALIDATION_MESSAGES.posts.membersOnly)
        );
    });

    test.each([
      [
        NUM_OF_PUBLIC_PUBLISHED_POSTS,
        {
          status: ['PUBLISHED'] as PostStatus[],
          visibility: ['PUBLIC'] as PostVisibility[],
        },
      ],
      [
        NUM_OF_ADMIN_ARCHIVED_POSTS,
        {
          status: ['ARCHIVED'] as PostStatus[],
        },
      ],
      [
        NUM_OF_MEMBERS_ONLY_DRAFTS_POSTS,
        {
          status: ['DRAFT'] as PostStatus[],
          visibility: ['MEMBERS_ONLY'] as PostVisibility[],
        },
      ],
      [
        NUM_OF_ADMIN_ARCHIVED_POSTS + NUM_OF_PUBLIC_PUBLISHED_POSTS,
        {
          status: ['ARCHIVED', 'PUBLISHED'] as PostStatus[],
          visibility: ['PUBLIC'] as PostVisibility[],
        },
      ],
      [
        NUM_OF_ADMIN_ARCHIVED_POSTS +
          NUM_OF_MEMBERS_ONLY_DRAFTS_POSTS +
          NUM_OF_ADMIN_DRAFTS_POSTS,
        {
          status: ['ARCHIVED', 'DRAFT'] as PostStatus[],
          visibility: ['PUBLIC', 'MEMBERS_ONLY'] as PostVisibility[],
        },
      ],
    ])(
      'should return the correct amount of posts (%s) after filtering (logged-in as author)',
      async (total, filterBy) => {
        const resDto = await postsService.getAll({
          viewerId: admin.id,
          pageSize: 25,
          filterBy,
        });
        expect(resDto.pagination.total).toBe(total);
      }
    );

    test.each([
      [
        NUM_OF_PUBLIC_PUBLISHED_POSTS,
        {
          status: ['PUBLISHED'] as PostStatus[],
          visibility: ['PUBLIC'] as PostVisibility[],
        },
      ],
      [
        0,
        {
          status: ['ARCHIVED'] as PostStatus[],
        },
      ],
      [
        0,
        {
          status: ['DRAFT'] as PostStatus[],
          visibility: ['MEMBERS_ONLY'] as PostVisibility[],
        },
      ],
      [
        NUM_OF_PUBLIC_PUBLISHED_POSTS,
        {
          status: ['ARCHIVED', 'PUBLISHED'] as PostStatus[],
          visibility: ['PUBLIC'] as PostVisibility[],
        },
      ],
      [
        0,
        {
          status: ['ARCHIVED', 'DRAFT'] as PostStatus[],
          visibility: ['PUBLIC', 'MEMBERS_ONLY'] as PostVisibility[],
        },
      ],
    ])(
      `should return the correct amount of posts (%s) 
      after filtering (logged-in as another user OR guest)`,
      async (total, filterBy) => {
        const resDto_anotherUser = await postsService.getAll({
          viewerId: user.id,
          pageSize: 25,
          filterBy,
        });
        expect(resDto_anotherUser.pagination.total).toBe(total);

        const resDto_asGuest = await postsService.getAll({
          pageSize: 25,
          filterBy,
        });
        expect(resDto_asGuest.pagination.total).toBe(total);
      }
    );

    test.each([
      [
        NUM_OF_PUBLIC_PUBLISHED_POSTS + NUM_OF_MEMBERS_ONLY_PUBLISHED_POSTS,
        {
          status: ['PUBLISHED'] as PostStatus[],
        },
        'PUBLISHED',
        true,
      ],
      [
        NUM_OF_MEMBERS_ONLY_DRAFTS_POSTS + NUM_OF_MEMBERS_ONLY_PUBLISHED_POSTS,
        {
          status: ['PUBLISHED', 'DRAFT'] as PostStatus[],
        },
        'MEMBERS_ONLY',
        true,
      ],
      [
        NUM_OF_ADMIN_DRAFTS_POSTS,
        {
          visibility: ['PUBLIC'] as PostVisibility[],
        },
        'DRAFT',
        true,
      ],
      [
        NUM_OF_ADMIN_DRAFTS_POSTS + NUM_OF_MEMBERS_ONLY_DRAFTS_POSTS,
        {},
        'DRAFT',
        true,
      ],
      [
        NUM_OF_MEMBERS_ONLY_DRAFTS_POSTS + NUM_OF_MEMBERS_ONLY_PUBLISHED_POSTS,
        {},
        'MEMBERS_ONLY',
        true,
      ],
      [
        0,
        {
          status: ['ARCHIVED'] as PostStatus[],
        },
        'PUBLISHED',
        true,
      ],
      [
        0,
        {
          status: ['ARCHIVED'] as PostStatus[],
        },
        'DRAFT',
        true,
      ],
      [
        0,
        {
          visibility: ['MEMBERS_ONLY'] as PostVisibility[],
        },
        'PUBLIC',
        true,
      ],
      [
        0,
        {
          visibility: ['PUBLIC'] as PostVisibility[],
        },
        'MEMBERS_ONLY',
        true,
      ],
      // Test: Non-author cannot see DRAFT posts even when filtering
      [
        0,
        {
          status: ['DRAFT'] as PostStatus[],
        },
        'DRAFT',
        false,
      ],
      // Test: Non-author cannot see ARCHIVED posts
      [
        0,
        {
          status: ['ARCHIVED'] as PostStatus[],
        },
        'ARCHIVED',
        false,
      ],
      // Test: Non-author can only see PUBLISHED posts when searching
      [
        NUM_OF_PUBLIC_PUBLISHED_POSTS + NUM_OF_MEMBERS_ONLY_PUBLISHED_POSTS,
        {},
        'PUBLISHED',
        false,
      ],
      // Test: Author can see only DRAFT posts when filtering by DRAFT
      [
        NUM_OF_ADMIN_DRAFTS_POSTS + NUM_OF_MEMBERS_ONLY_DRAFTS_POSTS,
        {
          status: ['DRAFT'] as PostStatus[],
        },
        'DRAFT',
        true,
      ],
      // Test: Combined filter - PUBLISHED + PUBLIC only
      [
        NUM_OF_PUBLIC_PUBLISHED_POSTS,
        {
          status: ['PUBLISHED'] as PostStatus[],
          visibility: ['PUBLIC'] as PostVisibility[],
        },
        'PUBLISHED',
        true,
      ],
      // Test: Combined filter - DRAFT + PUBLIC (author only)
      [
        NUM_OF_ADMIN_DRAFTS_POSTS,
        {
          status: ['DRAFT'] as PostStatus[],
          visibility: ['PUBLIC'] as PostVisibility[],
        },
        'DRAFT',
        true,
      ],
      // Test: Multiple statuses with visibility filter
      [
        NUM_OF_PUBLIC_PUBLISHED_POSTS + NUM_OF_ADMIN_DRAFTS_POSTS,
        {
          status: ['PUBLISHED', 'DRAFT'] as PostStatus[],
          visibility: ['PUBLIC'] as PostVisibility[],
        },
        'PUBLIC',
        true,
      ],
      // Test: Search with no filters returns only PUBLISHED posts for non-author
      [
        NUM_OF_PUBLIC_PUBLISHED_POSTS + NUM_OF_MEMBERS_ONLY_PUBLISHED_POSTS,
        undefined,
        'PUBLISHED',
        false,
      ],
      // Test: Empty search query with DRAFT filter (author)
      [
        NUM_OF_ADMIN_DRAFTS_POSTS + NUM_OF_MEMBERS_ONLY_DRAFTS_POSTS,
        {
          status: ['DRAFT'] as PostStatus[],
        },
        '',
        true,
      ],
      // Test: Filtering by all statuses (author should see all their posts)
      [
        NUM_OF_ADMIN_DRAFTS_POSTS +
          NUM_OF_MEMBERS_ONLY_DRAFTS_POSTS +
          NUM_OF_PUBLIC_PUBLISHED_POSTS +
          NUM_OF_MEMBERS_ONLY_PUBLISHED_POSTS +
          NUM_OF_ADMIN_ARCHIVED_POSTS,
        {
          status: ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as PostStatus[],
        },
        '',
        true,
      ],
      [
        NUM_OF_ADMIN_DRAFTS_POSTS +
          NUM_OF_MEMBERS_ONLY_DRAFTS_POSTS +
          NUM_OF_PUBLIC_PUBLISHED_POSTS +
          NUM_OF_MEMBERS_ONLY_PUBLISHED_POSTS +
          NUM_OF_ADMIN_ARCHIVED_POSTS,
        {},
        ':',
        true,
      ],
      // Test: Filtering by all visibilities with PUBLISHED status
      [
        NUM_OF_PUBLIC_PUBLISHED_POSTS + NUM_OF_MEMBERS_ONLY_PUBLISHED_POSTS,
        {
          status: ['PUBLISHED'] as PostStatus[],
          visibility: ['PUBLIC', 'MEMBERS_ONLY'] as PostVisibility[],
        },
        'PUBLISHED',
        true,
      ],
      // Test: Non-author searching DRAFT posts (should return 0)
      [0, {}, 'DRAFT', false],
      // Test: Author filtering MEMBERS_ONLY + DRAFT
      [
        NUM_OF_MEMBERS_ONLY_DRAFTS_POSTS,
        {
          status: ['DRAFT'] as PostStatus[],
          visibility: ['MEMBERS_ONLY'] as PostVisibility[],
        },
        'DRAFT',
        true,
      ],
      // Test: Non-author with PUBLIC visibility filter and search
      [
        NUM_OF_PUBLIC_PUBLISHED_POSTS,
        {
          visibility: ['PUBLIC'] as PostVisibility[],
        },
        'PUBLISHED',
        false,
      ],
    ])(
      `should return the correct amount of posts (%s) 
  after filtering and searching %s | search: %s (logged-in as author: %s)`,
      async (total, filterBy, searchQuery, isAuthor) => {
        const resDto = await postsService.getAll({
          viewerId: isAuthor ? admin.id : user.id,
          filterBy,
          searchQuery,
        });
        expect(resDto.pagination.total).toBe(total);
      }
    );

    test.each([
      // Test: Guest user filtering by tag
      [
        {
          tags: [validTags[0]],
        },
        false,
      ],
      // Test: Author filtering by tag
      [
        {
          tags: [validTags[0]],
        },
        true,
      ],
      // Test: Guest user filtering by random tags
      [
        {
          tags: [...validTags]
            .sort(() => 0.5 - Math.random())
            .splice(0, Math.floor((Math.random() * validTags.length) / 2) + 1),
        },
        false,
      ],
      // Test: Author filtering by random tags
      [
        {
          tags: [...validTags]
            .sort(() => 0.5 - Math.random())
            .splice(0, Math.floor((Math.random() * validTags.length) / 2) + 1),
        },
        true,
      ],
    ])(
      `should return the correct amount of posts 
        after filtering with tags %s (logged-in: %s)`,
      async (filterBy, isAuthor) => {
        const total = posts
          .filter(
            (p) =>
              p.status === 'PUBLISHED' ||
              (isAuthor &&
                p.authorId === author.id &&
                (p.status === 'ARCHIVED' || p.status === 'DRAFT'))
          )
          .filter(
            (p) =>
              filterBy.tags &&
              filterBy.tags.length &&
              p.tags?.some((t) => filterBy.tags.includes(t))
          ).length;

        const resDto = await postsService.getAll({
          viewerId: isAuthor ? author.id : undefined,
          filterBy,
        });
        expect(resDto.pagination.total).toBe(total);
      }
    );

    describe('filtering by year', () => {
      const postsForYearMap = new Map<number, Post[]>();
      const yearsForTest = [2001, 2016, 2009];

      beforeEach(async () => {
        await mockPostsRepo.deleteMany({});

        for (const year of yearsForTest) {
          const postsForYear = [];

          for (
            let i = 0;
            i < Math.floor(Math.random() * 10) + 2;
            i++ // Random amount of posts
          )
            postsForYear.push(
              await mockPostsRepo.create({
                ...validPostContent,
                title: year + generateRandomString(10),
                authorId: [admin.id, author.id][Math.floor(Math.random() * 2)],
                visibility: ['PUBLIC', 'MEMBERS_ONLY'][
                  Math.floor(Math.random() * 2)
                ] as PostVisibility,
                status: ['PUBLISHED', 'DRAFT', 'ARCHIVED'][
                  Math.floor(Math.random() * 3)
                ] as PostStatus,
                publishedAt: new Date(year, 1, 1),
              })
            );
          postsForYearMap.set(year, postsForYear);
        }
      });

      test.each([
        ['not a number', 'a'],
        ['a decimal', 1.5],
      ])(
        'should throw validation error when filterBy year is %s',
        async (_, year) => {
          expect.assertions(1);
          return postsService
            .getAll({
              filterBy: {
                year: year as any,
              },
            })
            .catch((error) => {
              expect(error.message).toMatch(/failed.*validation/i);
            });
        }
      );

      it('should show PUBLISHED posts by year of publishedDate when "filterBy.year" is specified', async () => {
        for (const year of yearsForTest) {
          const expectedPosts = postsForYearMap
            .get(year)
            ?.filter((p) => p.status === 'PUBLISHED');

          const resDto = await postsService.getAll({
            pageSize: 25,
            filterBy: {
              year,
            },
          });
          expect(resDto.pagination.total).toBe(expectedPosts?.length);
          for (const post of resDto.items) {
            expect(post.publishedAt?.getFullYear()).toBe(year);
            expect(post.status).toBe('PUBLISHED');
            expect(expectedPosts?.map((p) => p.id).includes(post.id)).toBe(
              true
            );
          }
        }
      });

      it(`should also show user private posts by year of publishedDate when 
        "filterBy.year" and viewerId is specified`, async () => {
        for (const year of yearsForTest) {
          const expectedPosts = postsForYearMap
            .get(year)
            ?.filter(
              (p) => p.status === 'PUBLISHED' || p.authorId === author.id
            );

          const resDto = await postsService.getAll({
            pageSize: 25,
            filterBy: {
              year,
            },
            viewerId: author.id,
          });
          expect(resDto.pagination.total).toBe(expectedPosts?.length);
          for (const post of resDto.items) {
            expect(post.publishedAt?.getFullYear()).toBe(year);
            expect(expectedPosts?.map((p) => p.id).includes(post.id)).toBe(
              true
            );
          }
        }
      });
    });

    test.each(['UNORGANIZED', 'HOT_TAKE', 'SHUNNED_ON_TWITTER'])(
      'should throw when filtering by unknown status',
      async (status) => {
        expect.assertions(1);
        return postsService
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

    test.each(['HIDDEN', 'premium', 'members_only'])(
      'should throw when filtering by unknown visibility',
      async (visibility) => {
        expect.assertions(1);
        return postsService
          .getAll({
            filterBy: {
              visibility: [visibility as any],
            },
          })
          .catch((error) => {
            expect(error.message).toMatch(/failed.*validation/i);
          });
      }
    );

    test.each([
      [['DRAFT'] as PostStatus[], [] as PostVisibility[]],
      [[] as PostStatus[], ['PUBLIC'] as PostVisibility[]],
    ])(
      'should throw when either visibility or status filtering are empty',
      async (status, visibility) => {
        expect.assertions(1);
        return postsService
          .getAll({
            filterBy: {
              visibility,
              status,
            },
          })
          .catch((error) => {
            expect(error.message).toMatch(/failed.*validation/i);
          });
      }
    );

    it(`should return user's DRAFT & ARCHIVED posts when filtering by status
       and viewerId matches their authorId`, async () => {
      const resDto = await postsService.getAll({
        viewerId: admin.id,
        pageSize: 25,
        filterBy: {
          status: ['DRAFT', 'ARCHIVED'],
        },
      });
      expect(resDto.items.some((p) => p.status === 'DRAFT')).toBe(true);
      expect(resDto.items.some((p) => p.status === 'ARCHIVED')).toBe(true);
      expect(resDto.pagination.total).toBe(
        NUM_OF_ADMIN_ARCHIVED_POSTS +
          NUM_OF_MEMBERS_ONLY_DRAFTS_POSTS +
          NUM_OF_ADMIN_DRAFTS_POSTS
      );
      expect(
        resDto.items
          .filter((p) => p.status === 'DRAFT' || p.status === 'ARCHIVED')
          .every((p) => p.authorId === admin.id)
      ).toBe(true);
    });

    it(`should not return another user's DRAFT & ARCHIVED posts when filtering by status`, async () => {
      const resDto = await postsService.getAll({
        viewerId: user.id,
        pageSize: 25,
        filterBy: {
          status: ['DRAFT', 'ARCHIVED'],
        },
      });
      expect(resDto.pagination.total).toBe(0);
    });

    it(`should not return another user's DRAFT & ARCHIVED posts when filtering by tags`, async () => {
      const privatePostsOfAnotherUser = posts.filter(
        (p) =>
          (p.status === 'DRAFT' || p.status === 'ARCHIVED') &&
          p.authorId !== author.id
      );

      const uniqueTagsPresentInOtherUsersPosts = [
        ...new Set(
          privatePostsOfAnotherUser.flatMap((post) => post.tags ?? [])
        ),
      ];

      for (const uniqueTag of uniqueTagsPresentInOtherUsersPosts) {
        const resDto = await postsService.getAll({
          viewerId: author.id,
          pageSize: 25,
          filterBy: {
            tags: [uniqueTag],
          },
        });

        expect(
          (resDto.items as PostWithTags[]).every(
            (p) =>
              p.tags?.includes(uniqueTag) &&
              // Either post is published or its private post with the author being the requesting user
              (p.status === 'PUBLISHED' || p.authorId === author.id)
          )
        ).toBe(true);
      }
    });

    test.each([
      ['array is empty', []],
      [
        'some are too long',
        [
          ...validTags,
          generateRandomString(TAG_CONSTRAINTS.MAX_NAME_LENGTH + 1),
        ],
      ],
      [
        'some are too short',
        [
          ...validTags,
          generateRandomString(TAG_CONSTRAINTS.MIN_NAME_LENGTH - 1),
        ],
      ],
      ['some are empty', [...validTags, '']],
      [
        'some contain uppercase letter',
        [...validTags, 'R' + generateRandomString(10)],
      ],
      [
        'some contain any symbol other than hyphen',
        [...validTags, '_' + generateRandomString(10)],
      ],
    ])('should throw when filtering by tags and %s', async (_, tags) => {
      expect.assertions(1);
      return postsService
        .getAll({
          filterBy: {
            tags,
          },
        })
        .catch((error) => {
          expect(error.message).toMatch(
            ERROR_MESSAGES[ERROR_CODES.VALIDATION.VALIDATION_ERROR]
          );
        });
    });

    test.each([
      [
        'too long (longer than a post title max length)',
        generateRandomString(POST_CONSTRAINTS.MAX_TITLE_LENGTH + 1),
      ],
    ])('should throw when the search query is %s', async (_, searchQuery) => {
      expect.assertions(1);
      return postsService.getAll({ searchQuery }).catch((error) => {
        expect(error.message).toMatch(
          ERROR_MESSAGES[ERROR_CODES.VALIDATION.VALIDATION_ERROR]
        );
      });
    });

    test.each(['PUBLISHED', 'DRAFT', 'ARCHIVED', validPostContent.content])(
      'should find posts by comparing search query (%s) with post title or content',
      async (searchQuery) => {
        const res = await postsService.getAll({
          searchQuery,
          viewerId: admin.id,
        });

        expect(res.pagination.total).toBeGreaterThan(0);
        expect(
          res.items.every(
            (p) =>
              p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              p.content.toLowerCase().includes(searchQuery.toLowerCase())
          )
        ).toBe(true);
      }
    );

    test.each([generateRandomString(10), 'UNKNOWN TITLE'])(
      `should not return any result when search query (%s) 
      does not correspond to any title or post content`,
      async (searchQuery) => {
        const res = await postsService.getAll({
          searchQuery,
          viewerId: admin.id,
        });

        expect(res.pagination.total).toBe(0);
      }
    );

    it(`should not return other user's DRAFT or ARCHIVED posts when 
      the search query matches their title`, async () => {
      const uniqueTitle = generateRandomString(20);
      await mockPostsRepo.create({
        ...validPostContent,
        authorId: admin.id,
        status: 'DRAFT',
        visibility: 'PUBLIC',
        title: uniqueTitle,
      });
      const res = await postsService.getAll({
        searchQuery: uniqueTitle,
        viewerId: user.id,
      });

      expect(res.count).toBe(0);
    });

    test.each([
      ['contain invalid key', { invalidKey: 'asc' }],
      ['specify invalid direction', { createdAt: 'invalid' }],
      ['specify valid direction but in the wrong case ', { createdAt: 'ASC' }],
      ['specify valid direction but in an array', { createdAt: ['asc'] }],
    ])('should throw when sorting options %s', async (_, sortBy) => {
      expect.assertions(1);

      return postsService
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
      ['published date (ASC)', getKey<Post>('publishedAt'), false],
      ['published date (DESC)', getKey<Post>('publishedAt'), true],
      ['created date (ASC)', getKey<Post>('createdAt'), false],
      ['created date (DESC)', getKey<Post>('createdAt'), true],
      ['updated date (ASC)', getKey<Post>('updatedAt'), false],
      ['updated date (DESC)', getKey<Post>('updatedAt'), true],
    ])(
      'should sort items provided that sorting by %s is applied',
      async (_, propName, isAscending: boolean) => {
        const res = await postsService.getAll({
          sortBy: {
            [propName]: isAscending ? 'asc' : 'desc',
          },
        });
        const sortedItems = [...res.items].sort((prev, next) => {
          if (!prev[propName] || !next[propName]) return 0;
          const prevDate = (prev[propName] as Date).getTime();
          const nextDate = (next[propName] as Date).getTime();
          return isAscending ? prevDate - nextDate : nextDate - prevDate;
        });

        sortedItems.forEach((post, i) => {
          expect(post.id).toBe(res.items[i].id);
        });
      }
    );

    const pageSizeOptions = PAGINATION.POSTS.ITEMS_PER_PAGE_OPTIONS;

    test.each([
      [2, pageSizeOptions[0]],
      [4, pageSizeOptions[0]],
      [21, pageSizeOptions[1]],
      [49, pageSizeOptions[2]],
    ])(
      'should throw when pagination offset (%s) is not divisible by page size (%s)',
      async (pageOffset, pageSize) => {
        expect.assertions(1);
        return postsService.getAll({ pageOffset, pageSize }).catch((error) => {
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
        const resDto = await postsService.getAll({
          pageOffset,
          pageSize,
        });
        expect(resDto.pagination.limit).toBe(pageSize);
        expect(resDto.pagination.page).toBe(expectedPageNum);
      }
    );
  });
  describe('create()', () => {
    const validPostCreateDto = {
      ...validPostContent,
      isDraft: true,
      isMembersOnly: false,
    };

    beforeEach(async () => {
      await mockPostsRepo.deleteMany({});
    });

    it('should create a post when valid post data is provided', async () => {
      await postsService.create({
        ...validPostCreateDto,
        authorId: admin.id,
      });
      expect(mockPostsRepo.create).toHaveBeenCalledTimes(1);
    });

    it('should set "publishedAt" date when creating a post with status "PUBLISHED"', async () => {
      // Creating a draft of a post
      const draft = await postsService.create({
        ...validPostCreateDto,
        title: 'NEW DRAFT',
        authorId: admin.id,
        isDraft: true,
      });
      expect(draft.publishedAt).toBe(null);

      // Creating a published post
      const post = await postsService.create({
        ...validPostCreateDto,
        authorId: admin.id,
        isDraft: false,
      });
      expect(post.publishedAt).not.toBe(null);
    });

    it('should create tags or associate existing tags to post if present', async () => {
      const tags = ['tag-1', 'tag-2'];

      // Add tags along with post
      const post = await postsService.create({
        ...validPostCreateDto,
        authorId: admin.id,
        tags,
      });

      for (const tag of tags)
        expect((post as any).tags.includes(tag)).toBe(true);

      const tagsWithOverlap = [...tags, 'tag-3'];

      // Add new and existing tags along with post
      const newPostWithOverlappingTags = await postsService.create({
        ...validPostCreateDto,
        title: generateRandomString(10),
        authorId: admin.id,
        tags: tagsWithOverlap,
      });

      for (const tag of tagsWithOverlap)
        expect(
          (newPostWithOverlappingTags as PostDetail).tags?.includes(tag)
        ).toBe(true);
    });

    it('should not create the same tag twice when specifying tags field', async () => {
      const tags = ['tag-1', 'tag-1'];

      expect.assertions(1);
      await postsService
        .create({
          ...validPostCreateDto,
          title: generateRandomString(10),
          authorId: admin.id,
          tags,
        })
        .catch((error) => {
          expect(error.message).toMatch(
            ERROR_MESSAGES[ERROR_CODES.VALIDATION.VALIDATION_ERROR]
          );
        });
    });

    test.each([
      [
        'is too long',
        generateRandomString(POST_CONSTRAINTS.MAX_TITLE_LENGTH + 1),
      ],
      [
        'is too short',
        generateRandomString(POST_CONSTRAINTS.MIN_TITLE_LENGTH - 1),
      ],
      ['is empty', ''],
    ])('should throw validation error when title %s', async (_, title) => {
      expect.assertions(1);
      return postsService
        .create({
          ...validPostCreateDto,
          authorId: admin.id,
          title,
        })
        .catch((error) => {
          expect(error.message).toMatch(/failed.*validation/i);
        });
    });

    test.each([
      [
        'is too long',
        generateRandomString(POST_CONSTRAINTS.MAX_CONTENT_LENGTH + 1),
      ],
      [
        'is too short',
        generateRandomString(POST_CONSTRAINTS.MIN_CONTENT_LENGTH - 1),
      ],
      ['is empty', ''],
      ['is null', null],
      ['is undefined', undefined],
      ['is number', 1],
    ])('should throw validation error when content %s', async (_, content) => {
      expect.assertions(1);
      return postsService
        .create({
          ...validPostCreateDto,
          authorId: admin.id,
          content: content as any,
        })
        .catch((error) => {
          expect(error.message).toMatch(/failed.*validation/i);
        });
    });

    test.each([
      ['is null', null],
      ['is undefined', undefined],
      ['is empty string', ''],
    ])('should throw validation error when authorId %s', async (_, id) => {
      expect.assertions(1);
      return postsService
        .create({
          ...validPostCreateDto,
          authorId: id as any,
        })
        .catch((error) => {
          expect(error.message).toMatch(/failed.*validation/i);
        });
    });

    test.each([
      [
        'is too long',
        generateRandomString(TAG_CONSTRAINTS.MAX_NAME_LENGTH + 1),
      ],
      [
        'is too short',
        generateRandomString(TAG_CONSTRAINTS.MIN_NAME_LENGTH - 1),
      ],
      ['is empty', ''],
      ['contains uppercase letter', 'R' + generateRandomString(20)],
      ['contains any symbol other than hyphen', '_' + generateRandomString(20)],
    ])(
      'should throw validation error when one of the tags is %s',
      async (_, title) => {
        expect.assertions(1);
        return postsService
          .create({
            ...validPostCreateDto,
            authorId: admin.id,
            tags: [title],
          })
          .catch((error) => {
            expect(error.message).toMatch(/failed.*validation/i);
          });
      }
    );

    it('should throw when the user creating the post does not exist', async () => {
      expect.assertions(1);
      return postsService
        .create({
          ...validPostCreateDto,
          authorId: 999,
        })
        .catch((error) => {
          expect(error.message).toMatch(
            ERROR_MESSAGES[ERROR_CODES.VALIDATION.USER_MISSING]
          );
        });
    });

    it('should throw error when post with this title already exists', async () => {
      const createdPost = await postsService.create({
        ...validPostCreateDto,
        authorId: admin.id,
        isDraft: true,
        isMembersOnly: false,
      });

      expect.assertions(1);

      return postsService
        .create({
          content: createdPost.content,
          title: createdPost.title,
          authorId: admin.id,
          isDraft: true,
          isMembersOnly: false,
        })
        .catch((error) => {
          expect(error.message).toMatch(
            ERROR_MESSAGES[ERROR_CODES.VALIDATION.POST_EXISTS]
          );
        });
    });
  });
  describe('update()', () => {
    let postForUpdate: Post;
    const validUpdateDto = {
      title: 'New title',
      content: 'COOL new content for post',
    };

    beforeEach(async () => {
      await mockPostsRepo.deleteMany({});
      postForUpdate = await mockPostsRepo.create({
        ...validPostContent,
        authorId: admin.id,
        status: 'DRAFT',
        visibility: 'PUBLIC',
        publishedAt: null,
      });
    });

    it('should update the post when valid data is provided', async () => {
      const updatedPost = await postsService.update({
        ...validUpdateDto,
        userId: admin.id,
        postId: postForUpdate.id,
        status: 'PUBLISHED',
        visibility: 'MEMBERS_ONLY',
      });
      expect(mockPostsRepo.update).toHaveBeenCalled();
      expect(updatedPost.title).not.toBe(postForUpdate.title);
      expect(updatedPost.title).toBe(validUpdateDto.title);
      expect(updatedPost.content).toBe(validUpdateDto.content);
      // Expect the updatedAt field to change due to update
      expect(updatedPost.updatedAt > postForUpdate.updatedAt).toBe(true);
    });

    it('should set published date when post status finally changes to "PUBLISHED"', async () => {
      expect(postForUpdate.publishedAt).toBe(null);
      const updatedPost = await postsService.update({
        ...validUpdateDto,
        userId: admin.id,
        postId: postForUpdate.id,
        status: 'PUBLISHED',
      });
      expect(updatedPost.publishedAt).not.toBe(null);

      jest.useFakeTimers();
      jest.advanceTimersByTime(1000 * 60); // 1 min
      // does not change again
      const repeatedUpdate = await postsService.update({
        ...validUpdateDto,
        userId: admin.id,
        postId: postForUpdate.id,
        status: 'PUBLISHED',
      });
      expect(repeatedUpdate.publishedAt).toStrictEqual(updatedPost.publishedAt);
      jest.useRealTimers();
    });

    it('should create tags or associate existing tags to post if present', async () => {
      const tags = ['tag-1', 'tag-2'];

      const updatedPost = await postsService.update({
        userId: admin.id,
        postId: postForUpdate.id,
        tags,
      });

      for (const tag of tags)
        expect((updatedPost as any).tags.includes(tag)).toBe(true);

      const tagsWithOverlap = [...tags, 'tag-3'];

      // Add new and existing tags along with post
      const updatedPostWithOverlappingTags = await postsService.update({
        userId: admin.id,
        postId: postForUpdate.id,
        tags: tagsWithOverlap,
      });

      for (const tag of tagsWithOverlap)
        expect((updatedPostWithOverlappingTags as any).tags.includes(tag)).toBe(
          true
        );
    });

    it('should remove old tags and replace them with the updated ones if "tags" field is present', async () => {
      const tags = ['tag-1', 'tag-2'];

      const updatedPost = await postsService.update({
        userId: admin.id,
        postId: postForUpdate.id,
        tags,
      });

      for (const tag of tags)
        expect((updatedPost as PostDetail).tags?.includes(tag)).toBe(true);

      const newTags = ['tag-3', 'tag-4'];

      const updatedPostWithNewTags = await postsService.update({
        userId: admin.id,
        postId: postForUpdate.id,
        tags: newTags,
      });

      for (const tag of newTags)
        expect((updatedPostWithNewTags as any).tags.includes(tag)).toBe(true);
    });

    test.each([
      ['is null', null],
      ['is undefined', undefined],
      ['is empty string', ''],
    ])('should throw validation error when userId %s', async (_, id) => {
      expect.assertions(1);
      return postsService
        .update({
          ...validUpdateDto,
          postId: postForUpdate.id,
          userId: id as any,
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
      return postsService
        .update({
          ...validUpdateDto,
          postId: id as any,
          userId: admin.id,
        })
        .catch((error) => {
          expect(error.message).toMatch(/failed.*validation/i);
        });
    });

    test.each([
      [
        'is too long',
        generateRandomString(POST_CONSTRAINTS.MAX_TITLE_LENGTH + 1),
      ],
      [
        'is too short',
        generateRandomString(POST_CONSTRAINTS.MIN_TITLE_LENGTH - 1),
      ],
      ['is empty', ''],
      ['is number', 1],
    ])('should throw validation error when title %s', async (_, title) => {
      expect.assertions(1);
      return postsService
        .update({
          ...validUpdateDto,
          postId: postForUpdate.id,
          userId: admin.id,
          title: title as any,
        })
        .catch((error) => {
          expect(error.message).toMatch(/failed.*validation/i);
        });
    });

    test.each([
      [
        'is too long',
        generateRandomString(TAG_CONSTRAINTS.MAX_NAME_LENGTH + 1),
      ],
      [
        'is too short',
        generateRandomString(TAG_CONSTRAINTS.MIN_NAME_LENGTH - 1),
      ],
      ['is empty', ''],
      ['contains uppercase letter', 'R' + generateRandomString(20)],
      ['contains any symbol other than hyphen', '_' + generateRandomString(20)],
    ])(
      'should throw validation error when one of the tags is %s',
      async (_, tag) => {
        expect.assertions(1);
        return postsService
          .update({
            postId: postForUpdate.id,
            userId: admin.id,
            tags: [tag],
          })
          .catch((error) => {
            expect(error.message).toMatch(/failed.*validation/i);
          });
      }
    );

    test.each([
      [
        'is too long',
        generateRandomString(POST_CONSTRAINTS.MAX_CONTENT_LENGTH + 1),
      ],
      [
        'is too short',
        generateRandomString(POST_CONSTRAINTS.MIN_CONTENT_LENGTH - 1),
      ],
      ['is empty', ''],
      ['is number', 1],
    ])('should throw validation error when content %s', async (_, content) => {
      expect.assertions(1);
      return postsService
        .update({
          ...validUpdateDto,
          userId: admin.id,
          postId: postForUpdate.id,
          content: content as any,
        })
        .catch((error) => {
          expect(error.message).toMatch(/failed.*validation/i);
        });
    });

    it(`should throw when trying to update the post title
       to match another post's title`, async () => {
      const existingTitle = 'Existing title';

      // create a new post
      await mockPostsRepo.create({
        ...validPostContent,
        status: 'DRAFT',
        visibility: 'PUBLIC',
        title: existingTitle,
        authorId: user.id,
      });

      expect.assertions(1);
      // try to use the same title of another post
      await postsService
        .update({
          ...validUpdateDto,
          userId: admin.id,
          postId: postForUpdate.id,
          title: existingTitle,
        })
        .catch((error) => {
          expect(error.message).toMatch(
            ERROR_MESSAGES[ERROR_CODES.VALIDATION.POST_EXISTS]
          );
        });
    });

    it('should throw when post is not found', async () => {
      expect.assertions(1);
      return postsService
        .update({ postId: 999, userId: admin.id, title: 'New valid title' })
        .catch((error) => {
          expect(error.message).toBe(
            ERROR_MESSAGES[ERROR_CODES.SERVER.NOT_FOUND]
          );
        });
    });

    it('should throw validation error when using the same tag twice in "tags" field', async () => {
      const tags = ['tag-1', 'tag-1'];

      expect.assertions(1);
      await postsService
        .update({
          ...validUpdateDto,
          userId: admin.id,
          postId: postForUpdate.id,
          tags,
        })
        .catch((error) => {
          expect(error.message).toMatch(
            ERROR_MESSAGES[ERROR_CODES.VALIDATION.VALIDATION_ERROR]
          );
        });
    });

    it(`should throw when post's authorId doesn't match provided userId`, async () => {
      expect.assertions(1);
      return postsService
        .update({
          postId: postForUpdate.id,
          userId: user.id,
          title: 'New valid title',
        })
        .catch((error) => {
          expect(error.message).toBe(
            ERROR_MESSAGES[ERROR_CODES.SERVER.FORBIDDEN]
          );
        });
    });
  });
  describe('delete()', () => {
    let postForDeletion: Post;
    beforeEach(async () => {
      await mockPostsRepo.deleteMany({});
      postForDeletion = await mockPostsRepo.create({
        ...validPostContent,
        authorId: admin.id,
        status: 'PUBLISHED',
        visibility: 'PUBLIC',
      });
    });
    it('should throw when post is not found', async () => {
      expect.assertions(1);
      return postsService
        .delete({ postId: 999, authorId: admin.id })
        .catch((error) => {
          expect(error.message).toBe(
            ERROR_MESSAGES[ERROR_CODES.SERVER.NOT_FOUND]
          );
        });
    });
    it(`should throw when post authorId doesn't match provided userId`, async () => {
      expect.assertions(1);
      return postsService
        .delete({ postId: postForDeletion.id, authorId: user.id })
        .catch((error) => {
          expect(error.message).toBe(
            ERROR_MESSAGES[ERROR_CODES.SERVER.FORBIDDEN]
          );
        });
    });
    it('should delete post when valid data is provided', async () => {
      await postsService.delete({
        postId: postForDeletion.id,
        authorId: postForDeletion.authorId,
      });
      expect(mockPostsRepo.delete).toHaveBeenCalled();
    });

    test.each([
      ['is null', null],
      ['is undefined', undefined],
      ['is empty string', ''],
    ])('should throw validation error when authorId %s', async (_, id) => {
      expect.assertions(1);
      return postsService
        .delete({
          postId: postForDeletion.id,
          authorId: id as any,
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
      return postsService
        .delete({
          postId: id as any,
          authorId: postForDeletion.authorId,
        })
        .catch((error) => {
          expect(error.message).toMatch(/failed.*validation/i);
        });
    });
  });
});
