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
  POST_CONSTRAINTS,
  VALIDATION_MESSAGES,
} from '@dans-coding-world/shared-constants';

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

    it(`should return post with its content hidden if it is members only
       and no logged in user is requesting it`, async () => {
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
      expect(retrievedPost.content).toEqual(VALIDATION_MESSAGES.posts.membersOnly);
    });

    it('should throw when the post is still a draft and the user requesting it is not the author', async () => {
      const createdPost = await mockPostsRepo.create({
        ...validPostContent,
        authorId: admin.id,
        status: 'DRAFT',
        visibility: 'PUBLIC',
      });

      expect.assertions(1);
      return postsService
        .getById({
          id: createdPost.id,
          userId: user.id,
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
