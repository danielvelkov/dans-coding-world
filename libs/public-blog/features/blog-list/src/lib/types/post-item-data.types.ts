import { Post, Profile, User } from '@dans-coding-world/prisma-schema';

export type AuthorPreview = Pick<User, 'id' | 'role' | 'username'> & {
  profile?: Omit<Profile, 'bio' | 'id' | 'userId'>;
};

export type BlogPostItem = Pick<Post, 'id' | 'title' | 'content'> & {
  publishedAt: Date;
  author: AuthorPreview;
  tags?: string[];
};
