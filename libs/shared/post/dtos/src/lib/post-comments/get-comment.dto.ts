import { Transform } from 'class-transformer';
import { IsInt, Min, IsOptional, Max } from 'class-validator';
import { toInteger } from '../custom-transformers/to-integer.js';
import { COMMENT_CONSTRAINTS } from '@dans-coding-world/shared-constants';

export class GetCommentDto {
  @Transform(toInteger)
  @IsInt()
  @Min(0)
  commentId: number;

  @Transform(toInteger)
  @IsInt()
  @Min(0)
  postId: number;

  @Transform(toInteger)
  @IsOptional()
  @IsInt()
  @Min(0)
  viewerId?: number;

  @IsOptional()
  @Transform(toInteger)
  @IsInt()
  @Min(1)
  @Max(COMMENT_CONSTRAINTS.MAX_REPLY_TREE_DEPTH)
  maxReplyLevels?: number;
}
