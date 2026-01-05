import { Collection, Paginated } from '@dans-coding-world/api-types';
import { PostFull } from '@dans-coding-world/post-data-access';

export type GetPostsResponseDto = Collection<PostFull> & Paginated;
