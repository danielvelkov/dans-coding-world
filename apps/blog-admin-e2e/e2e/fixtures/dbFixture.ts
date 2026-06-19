import { API_ENDPOINTS } from '@dans-coding-world/shared-data-access-api';
import { test as base } from '@playwright/test';
import type {
  Post,
  User,
  Profile,
  Comment,
  Tag,
} from '@dans-coding-world/prisma-schema';
import type { SeedOptions } from '@dans-coding-world/api-tools';
import axios from 'axios';

export interface Db {
  seedUsers(args: { users: any; options?: SeedOptions }): Promise<User[]>;
  seedProfiles(args: {
    profiles: any;
    options?: SeedOptions;
  }): Promise<Profile[]>;
  seedPosts(args: { posts: any; options?: SeedOptions }): Promise<Post[]>;
  seedComments(args: {
    comments: any;
    options?: SeedOptions;
  }): Promise<Comment[]>;
  seedTags(args: { tags: any; options?: SeedOptions }): Promise<Tag[]>;
  attachTags(args: {
    data: { postId: string; tagIds: string[] }[];
  }): Promise<any[]>;
}

export const test = base.extend<{ db: Db }>({
  db: async ({ baseURL }, use) => {
    const host = process.env.HOST ?? 'localhost';
    const port = process.env.PORT ?? '3000';
    axios.defaults.baseURL = `http://${host}:${port}`;

    const db: Db = {
      async seedUsers({ users, options }) {
        const {
          data: { data },
        } = await axios.post(API_ENDPOINTS.TEST_DATA.USERS, users, {
          params: options,
        });
        return data;
      },

      async seedProfiles({ profiles, options }) {
        const {
          data: { data },
        } = await axios.post(API_ENDPOINTS.TEST_DATA.PROFILES, profiles, {
          params: options,
        });
        return data;
      },

      async seedPosts({ posts, options }) {
        const {
          data: { data },
        } = await axios.post(API_ENDPOINTS.TEST_DATA.POSTS, posts, {
          params: options,
        });
        return data;
      },

      async seedComments({ comments, options }) {
        const {
          data: { data },
        } = await axios.post(API_ENDPOINTS.TEST_DATA.COMMENTS, comments, {
          params: options,
        });
        return data;
      },

      async seedTags({ tags, options }) {
        const {
          data: { data },
        } = await axios.post(API_ENDPOINTS.TEST_DATA.TAGS, tags, {
          params: options,
        });
        return data;
      },

      async attachTags({ data }) {
        const requests = data.map(({ postId, tagIds }) =>
          axios.patch(
            `${API_ENDPOINTS.TEST_DATA.POSTS}/${postId}/tags`,
            tagIds,
          ),
        );
        const results = await Promise.all(requests);
        return results.map((r) => r.data);
      },
    };

    await use(db);
  },
});

export * from '@playwright/test';
