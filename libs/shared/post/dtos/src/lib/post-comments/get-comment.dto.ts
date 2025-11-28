import { Transform } from 'class-transformer';
import { IsInt, Min, IsOptional, Max } from 'class-validator';
import { ToInteger } from '@dans-coding-world/validation';
import { COMMENT_CONSTRAINTS } from '@dans-coding-world/shared-constants';

export class GetCommentDto {
  @ToInteger()
  @IsInt()
  @Min(0)
  commentId: number;

  @ToInteger()
  @IsInt()
  @Min(0)
  postId: number;

  @ToInteger()
  @IsOptional()
  @IsInt()
  @Min(0)
  viewerId?: number;

  @IsOptional()
  @ToInteger()
  @IsInt()
  @Min(COMMENT_CONSTRAINTS.MIN_REPLY_TREE_DEPTH)
  @Max(COMMENT_CONSTRAINTS.MAX_REPLY_TREE_DEPTH)
  maxReplyLevels?: number;
}
