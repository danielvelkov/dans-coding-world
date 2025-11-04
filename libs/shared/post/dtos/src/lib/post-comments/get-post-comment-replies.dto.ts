import { Transform } from 'class-transformer';
import { IsInt, Min, IsOptional } from 'class-validator';
import { toInteger } from '../custom-transformers/to-integer.js';

export class GetPostCommentRepliesDto {
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
}
