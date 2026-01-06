import {
  Post,
  Profile,
  User,
  PostVisibilityEnum,
} from '@dans-coding-world/prisma-schema';

export type AuthorPreview = Pick<User, 'id' | 'username'> & {
  profile: Omit<Profile, 'bio' | 'id' | 'userId'> | null;
};

export type BlogPostItem = Pick<Post, 'id' | 'title' | 'content'> & {
  publishedAt: Date;
  updatedAt: Date;
  author: AuthorPreview;
  tags?: string[];
};

export type Visibility = typeof PostVisibilityEnum;
