import { Post } from '@dans-coding-world/prisma-schema';
import { Collection, Paginated } from '@dans-coding-world/api-types';

export type GetPostsResponseDto = Collection<Post> & Paginated;
