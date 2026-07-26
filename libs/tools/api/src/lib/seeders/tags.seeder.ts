import { client } from '@dans-coding-world/prisma-schema';
import type { Tag, Post } from '@dans-coding-world/prisma-schema';
import tags from '../data/tags.json' with { type: 'json' };
import { SeedOptions } from './types/seed-options.js';

/**
 * @description ⚠️ **Test-only method.** This function is intended for development and testing purposes only.
 *
 * **🚨 Do not use in production.** It will delete existing tag data.
 *
 * @param customTags Tags to create.
 * @param options Seed options for whether to reset the 'Tag' table and/or use default tags data
 *
 * *DEFAULT DATA*:
 * - 30 generic tags
 */
export const seedTags = async (
  customTags?: Tag[],
  options: SeedOptions = { clearExisting: true, useDefaults: true },
): Promise<Tag[]> => {
  if (!(process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'test_e2e'))
    throw new Error(
      'Not in test environment. Check your test setup configuration.',
    );
  try {
    const seeded: Tag[] = [];

    if (options.clearExisting) {
      await client.tag.deleteMany();
      await client.$queryRaw`ALTER SEQUENCE "Tag_id_seq" RESTART WITH 1;`;
    }

    if (options.useDefaults) {
      const defaultTags = await createAndReturnTagsWithId(tags);
      seeded.push(...defaultTags);
    }

    if (customTags && Array.isArray(customTags)) {
      const newTags = await createAndReturnTagsWithId(customTags);
      seeded.push(...newTags);
    }
    return seeded;
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
};

const createAndReturnTagsWithId = async (tags: { name: string }[]) => {
  if (!tags.length) return [];
  return await client.tag.createManyAndReturn({ data: tags });
};

/**
 * Helper: Attach existing tags to existing post
 * @param postId
 * @param tagIds
 * @returns The updated post
 */
export const attachTagsToPost = async (
  postId: number,
  tagIds: number[],
): Promise<Post> => {
  return await client.post.update({
    where: { id: postId },
    data: {
      tags: {
        create: tagIds.map((id) => ({
          tag: {
            connect: {
              id: +id,
            },
          },
        })),
      },
    },
    include: { tags: { include: { tag: true } } },
  });
};
