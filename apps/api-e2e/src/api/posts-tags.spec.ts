/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Tag,
  Post,
  User,
  client as prisma,
} from '@dans-coding-world/prisma-schema';
import {
  seedUsers,
  seedPosts,
  seedTags,
  attachTagsToPost,
} from '@dans-coding-world/testing-setup';
import { BaseResponse } from '@dans-coding-world/api-types';
import {
  ERROR_CODES,
  SUCCESS_MESSAGES,
  TAG_CONSTRAINTS,
} from '@dans-coding-world/shared-constants';
import { createAuthRouteHelper } from '../helper/auth-request.helper';
import { createAxiosClient } from '../helper/test-client.helper';
import { createPostsRouteHelper } from '../helper/posts-request.helper';
import { AxiosInstance, AxiosResponse } from 'axios';
import { createErrorCodeResponse } from '../helper/error-response.helper';
import { testInvalidIds } from '../helper/validation.helper';
import {
  CreateTagDto,
  GetTagsResponse,
} from '@dans-coding-world/shared-post-dto';
import { passwordGenerator as generateRandomString } from '@dans-coding-world/api-auth';

describe('/api/v1/tags', () => {
  let client: AxiosInstance;
  let login: (
    email: string,
    password: string
  ) => Promise<AxiosResponse<BaseResponse>>;
  let getPost: (postId: any) => Promise<AxiosResponse<unknown>>;
  let getTags: () => Promise<AxiosResponse<unknown>>;
  let getTagById: (tagId: any) => Promise<AxiosResponse<unknown>>;
  let updateTag: (tagId: any, name: string) => Promise<AxiosResponse<unknown>>;
  let deleteTag: (tagId: any) => Promise<AxiosResponse<unknown>>;
  let createTag: (dto: CreateTagDto) => Promise<AxiosResponse<unknown>>;

  let users: User[];
  let posts: Post[];
  let tags: Tag[];

  let admin: User;
  let author: User;
  let user: User;

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
    ({ getTagById, getTags, deleteTag, updateTag, createTag, getPost } =
      createPostsRouteHelper(client));
  });

  afterEach(async () => {
    // un-ban banned users
    await prisma.user.updateMany({
      data: {
        isBanned: false,
      },
    });
  });

  describe('GET /api/v1/tags', () => {
    it('should return all tags used in PUBLISHED posts', async () => {
      const res = await getTags();
      const { data } = res.data as BaseResponse;

      expect(data).toHaveProperty('message', SUCCESS_MESSAGES.TAGS.getAll);

      const { items, count } = data as GetTagsResponse;

      const expectedTags = [
        ...testData.publicOnlyTags,
        ...testData.privateAuthorTags_AlsoUsedOnPublic,
        ...testData.privateAdminTags_AlsoUsedOnPublic,
      ];
      const expectedTagIds = new Set(expectedTags.map((t) => t.id));

      expect(count).toBe(expectedTags.length);

      const returnedTagIds = items.map((tag) => tag.id);
      expect(returnedTagIds.every((id) => expectedTagIds.has(id))).toBe(true);
      expect(returnedTagIds).toHaveLength(expectedTagIds.size);
    });

    it(`should also return tags used in user's private posts when logged in`, async () => {
      await login(author.email, author.password);

      const res = await getTags();
      const { data } = res.data as BaseResponse;

      const { items, count } = data as GetTagsResponse;

      const expectedTags = [
        ...testData.publicOnlyTags,
        ...testData.privateAuthorTags,
        ...testData.privateAuthorTags_AlsoUsedOnPublic,
        ...testData.privateAdminTags_AlsoUsedOnPublic,
      ];
      const expectedTagIds = new Set(expectedTags.map((t) => t.id));

      expect(count).toBe(expectedTags.length);

      const returnedTagIds = items.map((tag) => tag.id);
      expect(returnedTagIds.every((id) => expectedTagIds.has(id))).toBe(true);

      // Expect every private post of another user not to be present
      expect(
        returnedTagIds.every((id) =>
          new Set(testData.privateAdminTags.map((t) => t.id)).has(id)
        )
      ).toBe(false);
      expect(returnedTagIds).toHaveLength(expectedTagIds.size);
    });
  });

  describe('GET /api/v1/tags/{id}', () => {
    testInvalidIds((id) => getTagById(id), 'tagId');

    it('should return 404 NOT FOUND for unknown tag id', async () => {
      return await expect(getTagById(999)).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.NOT_FOUND)
      );
    });

    it(`should return tag if it exists`, async () => {
      const randomTag = tags[Math.floor(Math.random() * tags.length)];
      const res = await getTagById(randomTag.id);
      const { data } = res.data as BaseResponse;

      expect(data).toHaveProperty('message', SUCCESS_MESSAGES.TAGS.get);

      const { tag } = data as { tag: Tag };
      expect(tag.id).toBe(randomTag.id);
      expect(tag.name).toBe(randomTag.name);
    });
  });

  describe('POST /api/v1/tags', () => {
    it(`should create a tag if logged in user is ADMIN or AUTHOR`, async () => {
      const name = 'tag-name';

      await login(admin.email, admin.password);

      const res = await createTag({ name: name });

      const { data } = res.data as BaseResponse;
      expect(data).toHaveProperty('message', SUCCESS_MESSAGES.TAGS.create);

      const tag = (data as any).tag as Tag;
      expect(tag.name).toBe(name);
    });

    it('should return 401 UNAUTHORIZED when trying to create tag as guest', async () => {
      const name = 'tag-name';
      return await expect(createTag({ name })).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.AUTH.UNAUTHORIZED)
      );
    });

    it('should return 403 FORBIDDEN when trying to create tag as anything other than ADMIN or AUTHOR', async () => {
      const name = 'tag-name';
      await login(user.email, user.password);
      return await expect(createTag({ name })).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.FORBIDDEN)
      );
    });

    it(`should return 409 CONFLICT when trying to create a tag that already exists`, async () => {
      const name = 'unique-name';

      await login(admin.email, admin.password);

      const res_initialCreate = await createTag({ name: name });

      const { data } = res_initialCreate.data as BaseResponse;
      expect(data).toHaveProperty('message', SUCCESS_MESSAGES.TAGS.create);

      return await expect(createTag({ name })).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.VALIDATION.TAG_EXISTS)
      );
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
      'should return validation error when tag name field %s',
      async (_, name) => {
        await login(admin.email, admin.password);

        await expect(createTag({ name })).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.VALIDATION.VALIDATION_ERROR)
        );
      }
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
      await login(author.email, author.password);
      return await expect(
        createTag({
          name: 'tag-name',
        })
      ).rejects.toMatchObject(createErrorCodeResponse(ERROR_CODES.AUTH.BANNED));
    });
  });

  describe('PATCH /api/v1/tags/{id}', () => {
    testInvalidIds(async (id) => {
      await login(admin.email, admin.password);
      return updateTag(id as any, 'new-tag-name');
    }, 'tagId');

    it(`should update a tag's name if the tag's author is
       ADMIN or AUTHOR`, async () => {
      const newName = 'new-tag-name';
      const tagForUpdate = tags[0];

      await login(admin.email, admin.password);

      const res = await updateTag(tagForUpdate?.id, newName);

      const { data } = res.data as BaseResponse;
      expect(data).toHaveProperty('message', SUCCESS_MESSAGES.TAGS.update);

      const tag = (data as any).tag as Tag;
      expect(tag.name).toBe(newName);
    });

    it(`should return 409 CONFLICT if new name is already used`, async () => {
      const tagForUpdate = tags[0];
      const tagWithExistingName = tags[1];

      await login(admin.email, admin.password);

      return await expect(
        updateTag(tagForUpdate.id, tagWithExistingName.name)
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.VALIDATION.TAG_EXISTS)
      );
    });

    it('should return 401 UNAUTHORIZED when trying to update tag as guest', async () => {
      return await expect(updateTag(1, 'new-tag-name')).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.AUTH.UNAUTHORIZED)
      );
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
      'should return validation error when updated tag name %s',
      async (_, name) => {
        const tagForUpdate = tags[0];

        await login(admin.email, admin.password);

        await expect(updateTag(tagForUpdate?.id, name)).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.VALIDATION.VALIDATION_ERROR)
        );
      }
    );

    it('should return 403 FORBIDDEN when trying to update a tag as anything other than ADMIN or AUTHOR', async () => {
      const name = 'new-tag-name';
      await login(user.email, user.password);
      return await expect(updateTag(tags[0].id, name)).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.FORBIDDEN)
      );
    });

    it('should return 404 NOT FOUND for unknown tag id', async () => {
      await login(admin.email, admin.password);
      await expect(
        updateTag(
          999,
          generateRandomString(12, {
            includeUppercase: false,
            includeSymbols: false,
          })
        )
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.NOT_FOUND)
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
      await login(author.email, author.password);
      return await expect(
        updateTag(tags[0].id, 'new-name')
      ).rejects.toMatchObject(createErrorCodeResponse(ERROR_CODES.AUTH.BANNED));
    });
  });

  describe('DELETE /api/v1/tags/{id}', () => {
    testInvalidIds(async (id) => {
      await login(admin.email, admin.password);
      return deleteTag(id);
    }, 'tagId');

    it('should delete a tag if logged in user is ADMIN or AUTHOR', async () => {
      const tagForDeletion = tags[0];
      await login(admin.email, admin.password);

      const res = await deleteTag(tagForDeletion.id);
      const { data } = res.data as BaseResponse;
      expect(data).toHaveProperty('message', SUCCESS_MESSAGES.TAGS.delete);

      await expect(deleteTag(tagForDeletion.id)).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.NOT_FOUND)
      );
    });

    it('deleting a tag should remove it from all posts where it was referenced', async () => {
      const publicPost = posts.find((p) => p.status === 'PUBLISHED');
      const res_beforeTagDeletion = await getPost(publicPost?.id);

      const { data } = res_beforeTagDeletion.data as BaseResponse;

      const postData = (data as any).post as Post & { tags: string[] };
      const tagForDeletion = testData.publicOnlyTags.find((t) =>
        postData.tags.includes(t.name)
      );
      if (!tagForDeletion) throw new Error('Missing test tag');

      await login(admin.email, admin.password);

      await deleteTag(tagForDeletion?.id);

      const res_afterTagDeletion = await getPost(publicPost?.id);

      const { data: dataAfterDeletion } =
        res_afterTagDeletion.data as BaseResponse;

      const postDataAfterDeletion = (dataAfterDeletion as any).post as Post & {
        tags: string[];
      };

      expect(
        postDataAfterDeletion.tags.includes(tagForDeletion?.name)
      ).not.toBe(true);
    });

    it('should return 401 UNAUTHORIZED when trying to delete tag as guest', async () => {
      return await expect(deleteTag(tags[0].id)).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.AUTH.UNAUTHORIZED)
      );
    });

    it('should return 404 NOT FOUND for unknown tag id', async () => {
      await login(admin.email, admin.password);
      await expect(deleteTag(999)).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.NOT_FOUND)
      );
    });

    it('should return 403 FORBIDDEN when user deleting the tag is not ADMIN or AUTHOR', async () => {
      await login(user.email, user.password);
      await expect(deleteTag(tags[0].id)).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.FORBIDDEN)
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
      await login(author.email, author.password);
      return await expect(deleteTag(tags[0].id)).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.AUTH.BANNED)
      );
    });
  });
});
