import { Collection, Paginated } from '@dans-coding-world/api-types';
import { Comment } from '@dans-coding-world/prisma-schema';
export type GetPostCommentsResponseDto = Collection<
  Comment & { replyCount: number }
> &
  Paginated;
