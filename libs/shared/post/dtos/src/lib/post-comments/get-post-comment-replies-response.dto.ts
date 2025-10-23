import { Comment } from '@dans-coding-world/prisma-schema';

export class GetPostCommentRepliesResponseDto {
  comment: Comment & { replies: Comment[] };
  replyCount: number;
}
