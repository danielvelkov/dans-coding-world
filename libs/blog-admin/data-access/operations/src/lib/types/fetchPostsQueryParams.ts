import { GetPostsDto } from '@dans-coding-world/shared-post-dto';

export type FetchPostsQueryParams = Omit<GetPostsDto, 'viewerId'>;
