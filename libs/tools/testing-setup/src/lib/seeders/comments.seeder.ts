import { client,  Comment } from '@dans-coding-world/prisma-schema';
import comments from '../data/posts-comments.json' with {type: "json"};
import { SeedOptions } from './types/seed-options.js';

/**
 * @description ⚠️ **Test-only method.** This function is intended for development and testing purposes only.
 * 
 * **🚨 Do not use in production.** It will delete existing comments data.
 * 
 * @param customComments Comments to create. 
 * Make sure the authors of the comments and the posts exist, otherwise an error will be thrown
 * @param options Seed options for whether to reset the 'Comment' table and/or use default comment data
 * 
 * *DEFAULT DATA*:
 * - Comments on posts with Id from 1-10;
 * - From users with ids 1, 2 or 3
 * - Some replies to comments here and there
 */
export const seedComments = async (
  customComments?: Comment[],
  options: SeedOptions = { clearExisting: true, useDefaults: true }
): Promise<Comment[]> => {
  if (!(process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'test_e2e'))
    throw new Error(
      'Not in test environment. Check your test setup configuration.'
    );
  try {
    const seeded: Comment[] = [];

    if (options.clearExisting) {
      await client.comment.deleteMany();
      await client.$queryRaw`ALTER SEQUENCE "Comment_id_seq" RESTART WITH 1;`;
    }

    if (options.useDefaults) {
      const defaultComments = await client.comment.createManyAndReturn({data:comments});
      seeded.push(...defaultComments);
    }

    if (customComments) {
      const newComments = await client.comment.createManyAndReturn({data:customComments});
      seeded.push(...newComments);
    }
    return seeded;
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await client.$disconnect();
  }
};