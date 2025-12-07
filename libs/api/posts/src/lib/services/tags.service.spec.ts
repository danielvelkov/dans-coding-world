import 'reflect-metadata';
import {
  POST_REPOSITORY_TOKEN,
  USER_REPOSITORY_TOKEN,
} from './posts.service.js';
import { TAG_REPOSITORY_TOKEN, TagsService } from './tags.service.js';
import {
  IPostRepository,
  ITagRepository,
  IUserRepository,
} from '@dans-coding-world/shared-data-access-interfaces';
import {
  Post,
  PostOrderByInput,
  PostStatusEnum,
  PostVisibilityEnum,
  PostWhereInput,
  Tag,
  TagWhereInput,
  User,
  client,
} from '@dans-coding-world/prisma-schema';
import { ReflectiveInjector } from 'injection-js';
import { PrismaPostDataAccess as MockPostRepository } from '@dans-coding-world/post-data-access';
import { PrismaUserDataAccess as MockUserRepository } from '@dans-coding-world/user-data-access';
import { PrismaPostTagsDataAccess as MockTagsRepository } from '@dans-coding-world/post-data-access';
import {
  ERROR_CODES,
  ERROR_MESSAGES,
  TAG_CONSTRAINTS,
} from '@dans-coding-world/shared-constants';
import { generateRandomString } from '@dans-coding-world/helpers';
import { ITagsService } from '../interfaces/tags-service.interface.js';

let tagsService: ITagsService;

let mockUsersRepo: IUserRepository;
let mockPostsRepo: IPostRepository<Post, PostWhereInput, PostOrderByInput>;
let mockTagsRepo: ITagRepository<Tag, TagWhereInput>;
let injector: ReflectiveInjector;

describe('TagsService', () => {
  let author: User;
  let admin: User;

  let tags: Tag[];
  let posts: Post[];

  afterEach(async () => {
    await mockPostsRepo.deleteMany({});
    await mockTagsRepo.deleteMany({});
    await client.user.deleteMany({});
  });

  beforeEach(async () => {
    mockPostsRepo = new MockPostRepository();
    mockUsersRepo = new MockUserRepository();
    mockTagsRepo = new MockTagsRepository();

    author = await mockUsersRepo.create({
      email: 'fakeAuthor123@gmail.com',
      password: 'RandomPass123',
      username: 'fakeAuthor123',
      role: 'AUTHOR',
    });

    admin = await mockUsersRepo.create({
      email: 'fakeAdmin123@gmail.com',
      password: 'RandomPass123',
      username: 'fakeAdmin123',
      role: 'ADMIN',
    });

    injector = ReflectiveInjector.resolveAndCreate([
      TagsService,
      {
        provide: USER_REPOSITORY_TOKEN,
        useValue: mockUsersRepo,
      },
      {
        provide: POST_REPOSITORY_TOKEN,
        useValue: mockPostsRepo,
      },
      {
        provide: TAG_REPOSITORY_TOKEN,
        useValue: mockTagsRepo,
      },
    ]);

    tagsService = injector.get(TagsService) as TagsService;

    jest.spyOn(mockTagsRepo, 'create');
    jest.spyOn(mockTagsRepo, 'update');
    jest.spyOn(mockTagsRepo, 'delete');
  });

  describe('getById()', () => {
    it('should return tag if it exists', async () => {
      const createdTag = await mockTagsRepo.create({
        name: 'Example name',
      });

      const tag = await tagsService.getById({
        tagId: createdTag.id,
      });

      expect(tag).toBeTruthy();
      expect(createdTag.id).toEqual(tag.id);
      expect(createdTag.name).toEqual(tag.name);
    });

    it('should throw when tag with this id does not exist', async () => {
      expect.assertions(1);
      return tagsService.getById({ tagId: 999 }).catch((error) => {
        expect(error.message).toMatch(
          ERROR_MESSAGES[ERROR_CODES.SERVER.NOT_FOUND]
        );
      });
    });

    test.each([
      ['is null', null],
      ['is undefined', undefined],
      ['is empty', ''],
    ])('should throw validation error when tagId param %s', async (_, id) => {
      expect.assertions(1);
      return tagsService.getById({ tagId: id as any }).catch((error) => {
        expect(error.message).toMatch(
          ERROR_MESSAGES[ERROR_CODES.VALIDATION.VALIDATION_ERROR]
        );
      });
    });
  });

  describe('getAll()', () => {
    const NUM_OF_TAGS = 20;

    beforeEach(async () => {
      tags = [];
      posts = [];

      for (let i = 0; i < NUM_OF_TAGS; i++)
        tags.push(
          await mockTagsRepo.create({
            name: 'tag-' + i,
          })
        );

      const statuses = [...Object.values(PostStatusEnum)];
      const visibilities = [...Object.values(PostVisibilityEnum)];
      const userIds = [author.id, admin.id];

      // Create a post...
      for (const status of statuses) // Of every status...
        for (const visibility of visibilities) // And every visibility...
          for (const id of userIds) {
            // For each user...
            const post = await mockPostsRepo.create({
              authorId: id,
              title: `${status.toString()} - ${visibility.toString()} - User #${id}`,
              content: 'RANDOM CONTENT',
              createdAt: new Date(),
              publishedAt: new Date(),
              updatedAt: new Date(),
              status,
              visibility,
            });

            posts.push(post);
          }
    });

    it('should return tags used for PUBLISHED posts when viewerId param is not provided', async () => {
      const publishedPosts = posts.filter((p) => p.status === 'PUBLISHED');

      await attachTagsToPostsEvenly(publishedPosts, tags);

      const privatePosts = posts.filter((p) => p.status !== 'PUBLISHED');

      await attachTagsToPostsEvenly(privatePosts, tags);

      const res = await tagsService.getAll();
      expect(res.items.length).toBe(publishedPosts.length);
    });

    it('should not return tags on posts that are not PUBLISHED', async () => {
      const privatePosts = posts.filter((p) => p.status !== 'PUBLISHED');

      await attachTagsToPostsEvenly(privatePosts, tags);

      const res = await tagsService.getAll();
      expect(res.count).toBe(0);
    });

    it(`should return tags on posts that are DRAFT or ARCHIVED
       when viewerId is set AND is the posts' author`, async () => {
      const publishedPosts = posts.filter((p) => p.status === 'PUBLISHED');

      await attachTagsToPostsEvenly(
        publishedPosts,
        tags.filter((_, i) => i < NUM_OF_TAGS / 2)
      );
      const privateAuthorPosts = posts.filter(
        (p) => p.status !== 'PUBLISHED' && p.authorId === author.id
      );

      await attachTagsToPostsEvenly(
        privateAuthorPosts,
        tags.filter((_, i) => i > NUM_OF_TAGS / 2)
      );

      const res = await tagsService.getAll({ viewerId: author.id });

      expect(res.items.length).toBe(
        privateAuthorPosts.length + publishedPosts.length
      );
    });
  });

  describe('create()', () => {
    beforeEach(async () => {
      await mockTagsRepo.deleteMany({});
    });

    it('should create a tag when valid name is provided', async () => {
      const tag = await tagsService.create({
        name: 'tag-1',
      });
      expect(mockTagsRepo.create).toHaveBeenCalledTimes(1);
      const createdTag = await mockTagsRepo.getById(tag.id);

      expect(createdTag?.id).toBe(tag.id);
      expect(createdTag?.name).toBe(tag.name);
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
      ['is null', null],
      ['is undefined', undefined],
      ['is number', 1],
      ['contains Upper case letter', 'Tag-1'],
      ['contains any symbol other than hyphen', 'Tag_1'],
    ])('should throw validation error when tag name %s', async (_, name) => {
      expect.assertions(1);
      return tagsService
        .create({
          name: name as any,
        })
        .catch((error) => {
          expect(error.message).toMatch(/failed.*validation/i);
        });
    });

    it('should throw error when tag with this name already exists', async () => {
      const UNIQUE_TAG_NAME = 'unique-tag-name';
      await tagsService.create({
        name: UNIQUE_TAG_NAME,
      });

      expect.assertions(1);

      return tagsService
        .create({
          name: UNIQUE_TAG_NAME,
        })
        .catch((error) => {
          expect(error.message).toMatch(
            ERROR_MESSAGES[ERROR_CODES.VALIDATION.TAG_EXISTS]
          );
        });
    });
  });

  describe('update()', () => {
    let tagForUpdate: Tag;
    const validUpdateDto = {
      name: 'new-tag-name',
    };

    beforeEach(async () => {
      await mockTagsRepo.deleteMany({});
      tagForUpdate = await mockTagsRepo.create({
        name: 'some-tag',
      });
    });

    it('should update the tag when valid data is provided', async () => {
      const updatedTag = await tagsService.update({
        ...validUpdateDto,
        tagId: tagForUpdate.id,
      });
      expect(mockTagsRepo.update).toHaveBeenCalled();
      expect(updatedTag.name).not.toBe(tagForUpdate.name);
      expect(updatedTag.name).toBe(validUpdateDto.name);
    });

    test.each([
      ['is null', null],
      ['is undefined', undefined],
      ['is empty string', ''],
    ])('should throw validation error when tagId %s', async (_, id) => {
      expect.assertions(1);
      return tagsService
        .update({
          ...validUpdateDto,
          tagId: id as any,
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
      ['is null', null],
      ['is undefined', undefined],
      ['is number', 1],
      ['contains Upper case letter', 'Tag-1'],
      ['contains any symbol other than hyphen', 'Tag_1'],
    ])('should throw validation error when tag name %s', async (_, name) => {
      expect.assertions(1);
      return tagsService
        .update({
          tagId: tagForUpdate.id,
          name: name as any,
        })
        .catch((error) => {
          expect(error.message).toMatch(/failed.*validation/i);
        });
    });

    it(`should throw when trying to update the tag name
       to match another tag's name`, async () => {
      const existingTagName = 'existing-tag';

      // create a new tag
      await mockTagsRepo.create({
        name: existingTagName,
      });

      expect.assertions(1);
      // try to use the same name of another tag
      await tagsService
        .update({
          tagId: tagForUpdate.id,
          name: existingTagName,
        })
        .catch((error) => {
          expect(error.message).toMatch(
            ERROR_MESSAGES[ERROR_CODES.VALIDATION.TAG_EXISTS]
          );
        });
    });

    it('should throw when tag is not found', async () => {
      expect.assertions(1);
      return tagsService
        .update({ tagId: 999, name: 'new-tag' })
        .catch((error) => {
          expect(error.message).toBe(
            ERROR_MESSAGES[ERROR_CODES.SERVER.NOT_FOUND]
          );
        });
    });
  });

  describe('delete()', () => {
    let tagForDeletion: Tag;

    beforeEach(async () => {
      await mockTagsRepo.deleteMany({});

      tagForDeletion = await mockTagsRepo.create({
        name: 'delete-me',
      });
    });

    it('should throw when tag is not found', async () => {
      expect.assertions(1);
      return tagsService.delete({ tagId: 999 }).catch((error) => {
        expect(error.message).toBe(
          ERROR_MESSAGES[ERROR_CODES.SERVER.NOT_FOUND]
        );
      });
    });

    it('should delete tag when valid data is provided', async () => {
      await tagsService.delete({
        tagId: tagForDeletion.id,
      });
      expect(mockTagsRepo.delete).toHaveBeenCalled();
    });

    test.each([
      ['is null', null],
      ['is undefined', undefined],
      ['is empty string', ''],
    ])('should throw validation error when tagId %s', async (_, id) => {
      expect.assertions(1);
      return tagsService
        .delete({
          tagId: id as any,
        })
        .catch((error) => {
          expect(error.message).toMatch(/failed.*validation/i);
        });
    });
  });

  async function attachTagsToPostsEvenly(posts: Post[], tags: Tag[]) {
    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      const tag = tags[i % tags.length]; // Allow only unique tags

      await mockPostsRepo.update(post.id, {
        tags: [tag.name],
      } as any);
    }
  }
});
