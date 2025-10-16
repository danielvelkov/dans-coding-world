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
  PostWhereInput,
  User,
} from '@dans-coding-world/prisma-schema';
import { ReflectiveInjector } from 'injection-js';
import { IPostsService } from '../interfaces/posts-service.interface.js';
import { MockPostDataAccess as MockPostRepository } from '@dans-coding-world/post-data-access';
import { MockUserDataAccess as MockUserRepository } from '@dans-coding-world/user-data-access';
import {
  ERROR_CODES,
  ERROR_MESSAGES,
  PAGINATION,
  POST_CONSTRAINTS,
  VALIDATION_MESSAGES,
} from '@dans-coding-world/shared-constants';
import { GetPostsDto } from '@dans-coding-world/shared-post-dto';

let mockUsersRepo: IUserRepository;
let mockPostsRepo: IPostRepository<Post, PostWhereInput, PostOrderByInput>;
let injector: ReflectiveInjector;
let postsService: IPostsService;

describe('posts service', () => {
  let user: User;
  let admin: User;
  const validPostContent = {
    title: 'Very valid title',
    content: 'Very valid description',
    createdAt: new Date(),
    publishedAt: null,
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockPostsRepo = new MockPostRepository();
    mockUsersRepo = new MockUserRepository();

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
        id: createdPost.id,
      });
      expect(post).toBeTruthy();
      expect(createdPost.id).toEqual(post.id);
    });

    it(`should return post with its content hidden if it is members-only
       and not a logged-in user is requesting it`, async () => {
      const createdPost = await mockPostsRepo.create({
        ...validPostContent,
        authorId: admin.id,
        status: 'PUBLISHED',
        visibility: 'MEMBERS_ONLY',
      });
      const retrievedPost = await postsService.getById({
        id: createdPost.id,
      });
      expect(retrievedPost).toBeTruthy();
      expect(createdPost.id).toEqual(retrievedPost.id);
      expect(retrievedPost.content).toEqual(
        VALIDATION_MESSAGES.posts.membersOnly
      );
    });

    it(`should throw when the post is a draft,
      and the user requesting it is not the author`, async () => {
      const createdPost = await mockPostsRepo.create({
        ...validPostContent,
        authorId: admin.id,
        status: 'DRAFT',
        visibility: 'PUBLIC',
      });

      expect.assertions(2);

      // Retrieve post when viewerId is author
      const post = await postsService.getById({
        id: createdPost.id,
        viewerId: admin.id,
      });
      expect(post.id).toBeTruthy();

      // Retrieve post as another user
      return postsService
        .getById({
          id: createdPost.id,
          viewerId: user.id,
        })
        .catch((error) => {
          expect(error.message).toMatch(
            ERROR_MESSAGES[ERROR_CODES.SERVER.FORBIDDEN]
          );
        });
    });

    it('should throw when post with this id does not exist', async () => {
      expect.assertions(1);
      return postsService.getById({ id: -999 }).catch((error) => {
        expect(error.message).toMatch(/.*not.*found/i);
      });
    });
  });
  describe('getAll()', () => {
    const NUM_OF_PUBLIC_PUBLISHED_POSTS = 15;
    const NUM_OF_MEMBERS_ONLY_PUBLISHED_POSTS = 4;
    const NUM_OF_MEMBERS_ONLY_DRAFTS_POSTS = 3;
    const NUM_OF_DRAFTS_POSTS = 2;
    const NUM_OF_ARCHIVED_POSTS = 2;

    beforeEach(async () => {
      mockPostsRepo.deleteMany({});
      for (let i = 0; i < NUM_OF_PUBLIC_PUBLISHED_POSTS; i++)
        mockPostsRepo.create({
          ...validPostContent,
          title: `PUBLIC & PUBLISHED: #${i}`,
          authorId: admin.id,
          status: 'PUBLISHED',
          visibility: 'PUBLIC',
          publishedAt: new Date(
            Date.now() + i * 1000 * 60 * 3 // 3 minutes between
          ),
        });

      for (let i = 0; i < NUM_OF_MEMBERS_ONLY_PUBLISHED_POSTS; i++)
        mockPostsRepo.create({
          ...validPostContent,
          title: `MEMBERS_ONLY & PUBLISHED: #${i}`,
          authorId: admin.id,
          status: 'PUBLISHED',
          visibility: 'MEMBERS_ONLY',
          publishedAt: new Date(
            Date.now() + i * 1000 * 60 * 3 // 3 minutes between
          ),
        });

      for (let i = 0; i < NUM_OF_MEMBERS_ONLY_DRAFTS_POSTS; i++)
        mockPostsRepo.create({
          ...validPostContent,
          title: `MEMBERS_ONLY & DRAFT: #${i}`,
          authorId: admin.id,
          status: 'DRAFT',
          visibility: 'MEMBERS_ONLY',
          publishedAt: new Date(
            Date.now() + i * 1000 * 60 * 3 // 3 minutes between
          ),
        });

      for (let i = 0; i < NUM_OF_DRAFTS_POSTS; i++)
        mockPostsRepo.create({
          ...validPostContent,
          title: `DRAFT: #${i}`,
          authorId: admin.id,
          status: 'DRAFT',
          visibility: 'PUBLIC',
          publishedAt: new Date(
            Date.now() + i * 1000 * 60 * 3 // 3 minutes between
          ),
        });

      for (let i = 0; i < NUM_OF_ARCHIVED_POSTS; i++)
        mockPostsRepo.create({
          ...validPostContent,
          title: `ARCHIVED: #${i}`,
          authorId: admin.id,
          status: 'ARCHIVED',
          visibility: 'PUBLIC',
          publishedAt: new Date(
            Date.now() + i * 1000 * 60 * 3 // 3 minutes between
          ),
        });
    });

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
      return postsService.getAll({ pageSize, pageOffset }).catch((error) => {
        expect(error.message).toMatch(
          ERROR_MESSAGES[ERROR_CODES.VALIDATION.VALIDATION_ERROR]
        );
      });
    });

    it.only('should return PUBLISHED posts by default', async () => {
      const resDto = await postsService.getAll({ searchQuery: 'a' });

      expect(resDto.pagination.total).toBe(
        NUM_OF_PUBLIC_PUBLISHED_POSTS + NUM_OF_MEMBERS_ONLY_PUBLISHED_POSTS
      );
      expect(resDto.items.length).toBe(resDto.count);

      // Default page when no offset provided is 1
      expect(resDto.pagination.page).toBe(1);
      expect(resDto.count).toBe(PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE);
    });

    it(`should hide post content for members-only posts when no viewerId provided`, async () => {
      const resDto_WithoutViewerId = await postsService.getAll(
        new GetPostsDto()
      );
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

    it(`should return user's DRAFT & ARCHIVED posts if viewerId matches their authorId`, async () => {
      const resDto = await postsService.getAll({
        viewerId: admin.id,
        pageSize: 25,
      });
      expect(resDto.items.some((p) => p.status === 'DRAFT')).toBe(true);
      expect(resDto.items.some((p) => p.status === 'ARCHIVED')).toBe(true);
      expect(resDto.pagination.total).toBeGreaterThanOrEqual(
        NUM_OF_DRAFTS_POSTS +
          NUM_OF_ARCHIVED_POSTS +
          NUM_OF_MEMBERS_ONLY_PUBLISHED_POSTS +
          NUM_OF_PUBLIC_PUBLISHED_POSTS
      );
      expect(
        resDto.items
          .filter((p) => p.status === 'DRAFT' || p.status === 'ARCHIVED')
          .every((p) => p.authorId === admin.id)
      ).toBe(true);
    });

    const pageSizeOptions = PAGINATION.POSTS.ITEMS_PER_PAGE_OPTIONS;

    test.each([
      [2, pageSizeOptions[0]],
      [4, pageSizeOptions[0]],
      [21, pageSizeOptions[1]],
      [49, pageSizeOptions[2]],
    ])(
      'should throw when pagination offset (%s) is not devisable by page size (%s)',
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
    it('should create a post when valid post data is provided', async () => {
      await postsService.create({
        ...validPostCreateDto,
        authorId: admin.id,
      });
      expect(mockPostsRepo.create).toHaveBeenCalled();
    });

    it('should set "publishedAt" date when creating a post with status "PUBLISHED"', async () => {
      const post = await postsService.create({
        ...validPostCreateDto,
        authorId: admin.id,
        isDraft: false,
      });
      expect(post.publishedAt).not.toBe(null);

      const draft = await postsService.create({
        ...validPostCreateDto,
        title: 'NEW DRAFT',
        authorId: admin.id,
        isDraft: true,
      });
      expect(draft.publishedAt).toBe(null);
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
    ])('should throw validation error when content %s', async (_, content) => {
      expect.assertions(1);
      return postsService
        .create({
          ...validPostCreateDto,
          authorId: admin.id,
          content,
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

    it('should throw when the user creating the post does not exist', async () => {
      expect.assertions(1);
      return postsService
        .create({
          ...validPostCreateDto,
          authorId: -999,
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
          ...createdPost,
          authorId: admin.id,
          isDraft: true,
          isMembersOnly: false,
        })
        .catch((error) => {
          expect(error.message).toMatch(
            VALIDATION_MESSAGES.posts.titleAlreadyExists
          );
        });
    });

    it('should throw when the user creating the post is anything other than "ADMIN"', async () => {
      expect.assertions(1);
      return postsService
        .create({
          ...validPostCreateDto,
          authorId: user.id,
          isDraft: true,
          isMembersOnly: false,
        })
        .catch((error) => {
          expect(error.message).toMatch(
            ERROR_MESSAGES[ERROR_CODES.SERVER.FORBIDDEN]
          );
        });
    });
  });
  describe('update()', () => {
    let postForUpdate: Post;
    const validUpdateDto = {
      title: 'New title',
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

    it(`should throw when trying to update the post title
       to match another post's title`, async () => {
      const existingTitle = 'Existing title';

      // create a new post
      mockPostsRepo.create({
        ...validPostContent,
        status: 'DRAFT',
        visibility: 'PUBLIC',
        title: existingTitle,
        authorId: user.id,
      });

      expect.assertions(1);
      // try to use the same title of another post
      postsService
        .update({
          ...validUpdateDto,
          userId: admin.id,
          postId: postForUpdate.id,
          title: existingTitle,
        })
        .catch((error) => {
          expect(error.message).toMatch(
            VALIDATION_MESSAGES.posts.titleAlreadyExists
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

    it(`should throw when post authorId doesn't match provided userId`, async () => {
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
  });
});

function generateRandomString(length: number) {
  const LETTERS_IN_ALPHABET = 26;
  const lowercaseLetters = Array.from({ length: LETTERS_IN_ALPHABET }, (_, i) =>
    String.fromCharCode('a'.charCodeAt(0) + i)
  );
  const text = [];
  for (let i = length; i > 0; i--)
    text.push(
      lowercaseLetters[Math.floor(Math.random() * lowercaseLetters.length)]
    );
  return text.join('');
}
