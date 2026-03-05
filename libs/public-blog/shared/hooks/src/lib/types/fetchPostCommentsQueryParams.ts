import { GetPostCommentsDto } from '@dans-coding-world/shared-post-dto';

export type FetchPostCommentsQueryParams = Omit<
  GetPostCommentsDto,
  'viewerId' | 'maxReplyLevels'
> & { depth: number };
