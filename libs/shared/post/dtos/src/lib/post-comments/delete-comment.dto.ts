import { Transform } from 'class-transformer';
import { IsInt, Min } from 'class-validator';
import { toInteger } from '../custom-transformers/to-integer.js';

export class DeleteCommentDto {
  @Transform(toInteger)
  @Min(0)
  @IsInt()
  commentId: number;

  @Transform(toInteger)
  @Min(0)
  @IsInt()
  postId: number;

  @Transform(toInteger)
  @Min(0)
  @IsInt()
  authorId: number;
}
