import { client, Post } from '@dans-coding-world/prisma-schema';
import posts from '../data/posts.json' with {type: "json"};
import { SeedOptions } from './types/seed-options.js';

/**
 * @description ⚠️ **Test-only method.** This function is intended for development and testing purposes only.
 * 
 * **🚨 Do not use in production.** It will delete existing post data.
 * 
 * @param customPosts Posts to create. 
 * Make sure the authors of the posts exist, otherwise an error will be thrown
 * @param options Seed options for whether to reset the 'Post' table and/or use default post data
 * 
 * *DEFAULT DATA*:
 * - For users with id **1 and 4**;
 * - 6 posts each;
 * - Different combinations of post status and visibility;
 * - Post title contains names of its status and visibility
 */
export const seedPosts = async (
  customPosts?: Post[],
  options: SeedOptions = { clearExisting: true, useDefaults: true }
): Promise<Post[]> => {
  if (!(process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'test_e2e'))
    throw new Error(
      'Not in test environment. Check your test setup configuration.'
    );
  try {
    const seeded: Post[] = [];

    if (options.clearExisting) {
      await client.post.deleteMany();
      await client.$queryRaw`ALTER SEQUENCE "Post_id_seq" RESTART WITH 1;`;
    }

    if (options.useDefaults) {
      const defaultPosts = await createAndReturnPostsWithId(posts);
      seeded.push(...defaultPosts);
    }

    if (customPosts) {
      const newPosts = await createAndReturnPostsWithId(customPosts);
      seeded.push(...newPosts);
    }
    return seeded;
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await client.$disconnect();
  }
};

const createAndReturnPostsWithId = async (posts: any[]) => {
  if (!posts.length) return [];
  return await client.post.createManyAndReturn(
    { data: posts }
  );
};
