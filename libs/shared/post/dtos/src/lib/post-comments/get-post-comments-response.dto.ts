import { Collection, Paginated } from '@dans-coding-world/api-types';
import { CommentWithReplies } from '@dans-coding-world/prisma-schema';
export type GetPostCommentsResponseDto = Collection<CommentWithReplies> &
  Paginated;
