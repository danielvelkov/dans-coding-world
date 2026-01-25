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
import {
  ERROR_CODES,
  SUCCESS_MESSAGES,
  TAG_CONSTRAINTS,
} from '@dans-coding-world/shared-constants';
import { setupClient } from '../helper/test-client.helper';
import { createPostsRouteHelper } from '../helper/posts-request.helper';
import { createErrorCodeResponse } from '../helper/error-response.helper';
import { testInvalidIds } from '../helper/test-cases.helper';
import { GetTagsResponse } from '@dans-coding-world/shared-post-dto';
import { passwordGenerator as generateRandomString } from '@dans-coding-world/helpers';
import { getData, getMessage } from '../helper/common.helper';

describe('/api/v1/tags', () => {
  type PostsHelper = ReturnType<typeof createPostsRouteHelper>;

  let adminHelpers: PostsHelper;
  let userHelpers: PostsHelper;
  let authorHelpers: PostsHelper;
  let anonHelpers: PostsHelper; // For unauthenticated requests

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

    [adminHelpers, userHelpers, authorHelpers, anonHelpers] = await Promise.all(
      [
        setupClient(createPostsRouteHelper, admin),
        setupClient(createPostsRouteHelper, user),
        setupClient(createPostsRouteHelper, author),
        setupClient(createPostsRouteHelper, undefined),
      ]
    );
  });

  describe('GET /api/v1/tags', () => {
    it('should return all tags used in PUBLISHED posts', async () => {
      const res = await anonHelpers.getTags();

      expect(getMessage(res)).toBe(SUCCESS_MESSAGES.TAGS.getAll);

      const { items, count } = getData<GetTagsResponse>(res);

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
      const res = await authorHelpers.getTags();

      const { items, count } = getData<GetTagsResponse>(res);

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
    testInvalidIds((id) => anonHelpers.getTagById(id), 'tagId');

    it('should return 404 NOT FOUND for unknown tag id', async () => {
      return await expect(anonHelpers.getTagById('999')).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.NOT_FOUND)
      );
    });

    it(`should return tag if it exists`, async () => {
      const randomTag = tags[Math.floor(Math.random() * tags.length)];
      const res = await anonHelpers.getTagById(randomTag.id.toString());

      expect(getMessage(res)).toBe(SUCCESS_MESSAGES.TAGS.get);

      const tag = getData<Tag>(res, 'tag');
      expect(tag.id).toBe(randomTag.id);
      expect(tag.name).toBe(randomTag.name);
    });
  });

  describe('POST /api/v1/tags', () => {
    const NEW_TAG_NAME = 'tag-name';
    it(`should create a tag if logged in user is ADMIN or AUTHOR`, async () => {
      const res = await adminHelpers.createTag({ name: NEW_TAG_NAME });

      expect(getMessage(res)).toBe(SUCCESS_MESSAGES.TAGS.create);

      const tag = getData<Tag>(res, 'tag');
      expect(tag.name).toBe(NEW_TAG_NAME);
    });

    it('should return 401 UNAUTHORIZED when trying to create tag as guest', async () => {
      return await expect(
        anonHelpers.createTag({ name: NEW_TAG_NAME })
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.AUTH.UNAUTHORIZED)
      );
    });

    it('should return 403 FORBIDDEN when trying to create tag as anything other than ADMIN or AUTHOR', async () => {
      return await expect(
        userHelpers.createTag({ name: NEW_TAG_NAME })
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.FORBIDDEN)
      );
    });

    it(`should return 409 CONFLICT when trying to create a tag that already exists`, async () => {
      const UNIQUE_TAG_NAME = 'unique-name';

      const res = await adminHelpers.createTag({
        name: UNIQUE_TAG_NAME,
      });
      expect(getMessage(res)).toBe(SUCCESS_MESSAGES.TAGS.create);

      return await expect(
        adminHelpers.createTag({ name: UNIQUE_TAG_NAME })
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.VALIDATION.TAG_EXISTS)
      );
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
      'should return validation error when tag name field %s',
      async (_, name) => {
        await expect(adminHelpers.createTag({ name })).rejects.toMatchObject(
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
      try {
        await expect(
          authorHelpers.createTag({
            name: 'tag-name',
          })
        ).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.AUTH.BANNED)
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

  describe('PATCH /api/v1/tags/{id}', () => {
    testInvalidIds(async (id) => {
      return adminHelpers.updateTag(id as any, 'new-tag-name');
    }, 'tagId');

    it(`should update a tag's name if the tag's author is
       ADMIN or AUTHOR`, async () => {
      const newName = 'new-tag-name';
      const tagForUpdate = tags[0];

      const res = await adminHelpers.updateTag(
        tagForUpdate?.id.toString(),
        newName
      );

      expect(getMessage(res)).toBe(SUCCESS_MESSAGES.TAGS.update);

      const tag = getData<Tag>(res, 'tag');
      expect(tag.name).toBe(newName);
    });

    it(`should return 409 CONFLICT if new name is already used`, async () => {
      const tagForUpdate = tags[0];
      const tagWithExistingName = tags[1];

      return await expect(
        adminHelpers.updateTag(
          tagForUpdate.id.toString(),
          tagWithExistingName.name
        )
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.VALIDATION.TAG_EXISTS)
      );
    });

    it('should return 401 UNAUTHORIZED when trying to update tag as guest', async () => {
      return await expect(
        anonHelpers.updateTag('1', 'new-tag-name')
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.AUTH.UNAUTHORIZED)
      );
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
      'should return validation error when updated tag name %s',
      async (_, name) => {
        const tagForUpdate = tags[0];

        await expect(
          adminHelpers.updateTag(tagForUpdate?.id.toString(), name)
        ).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.VALIDATION.VALIDATION_ERROR)
        );
      }
    );

    it('should return 403 FORBIDDEN when trying to update a tag as normal user', async () => {
      const name = 'new-tag-name';
      return await expect(
        userHelpers.updateTag(tags[0].id.toString(), name)
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.FORBIDDEN)
      );
    });

    it('should return 404 NOT FOUND for unknown tag id', async () => {
      await expect(
        adminHelpers.updateTag(
          '9999',
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
      return await expect(
        authorHelpers.updateTag(tags[0].id.toString(), 'new-name')
      ).rejects.toMatchObject(createErrorCodeResponse(ERROR_CODES.AUTH.BANNED));
    });
  });

  describe('DELETE /api/v1/tags/{id}', () => {
    testInvalidIds(async (id) => {
      return adminHelpers.deleteTag(id);
    }, 'tagId');

    it('should delete a tag if logged in user is ADMIN or AUTHOR', async () => {
      const tagForDeletion = tags[0];

      const res = await adminHelpers.deleteTag(tagForDeletion.id.toString());
      expect(getMessage(res)).toBe(SUCCESS_MESSAGES.TAGS.delete);

      await expect(
        adminHelpers.deleteTag(tagForDeletion.id.toString())
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.NOT_FOUND)
      );
    });

    it('deleting a tag should remove it from all posts where it was referenced', async () => {
      const publicPost = posts.find((p) => p.status === 'PUBLISHED');
      if (!publicPost) throw new Error('Missing test post');

      const res_beforeTagDeletion = await anonHelpers.getPost(
        publicPost?.id.toString()
      );

      const postData = getData<Post & { tags: string[] }>(
        res_beforeTagDeletion,
        'post'
      );

      const tagForDeletion = testData.publicOnlyTags.find((t) =>
        postData.tags.includes(t.name)
      );
      if (!tagForDeletion) throw new Error('Missing test tag');

      await adminHelpers.deleteTag(tagForDeletion?.id.toString());

      const res_afterTagDeletion = await adminHelpers.getPost(
        publicPost?.id.toString()
      );

      const postDataAfterDeletion = getData<Post & { tags: string[] }>(
        res_afterTagDeletion,
        'post'
      );

      expect(
        postDataAfterDeletion.tags.includes(tagForDeletion?.name)
      ).not.toBe(true);
    });

    it('should return 401 UNAUTHORIZED when trying to delete tag as guest', async () => {
      return await expect(
        anonHelpers.deleteTag(tags[0].id.toString())
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.AUTH.UNAUTHORIZED)
      );
    });

    it('should return 404 NOT FOUND for unknown tag id', async () => {
      await expect(adminHelpers.deleteTag('9999')).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.NOT_FOUND)
      );
    });

    it('should return 403 FORBIDDEN when user deleting the tag is not ADMIN or AUTHOR', async () => {
      await expect(
        userHelpers.deleteTag(tags[0].id.toString())
      ).rejects.toMatchObject(
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
      return await expect(
        authorHelpers.deleteTag(tags[0].id.toString())
      ).rejects.toMatchObject(createErrorCodeResponse(ERROR_CODES.AUTH.BANNED));
    });
  });
});
