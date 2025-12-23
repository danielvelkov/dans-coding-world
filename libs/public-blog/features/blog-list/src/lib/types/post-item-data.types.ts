import { Post, Profile } from '@dans-coding-world/prisma-schema';

export type AuthorPreview = Omit<Profile, 'bio' | 'id'>;

export type PostItemData = Pick<
  Post,
  'id' | 'title' | 'content' | 'publishedAt' | 'visibility'
> & { author: AuthorPreview; tags?: string[] };
