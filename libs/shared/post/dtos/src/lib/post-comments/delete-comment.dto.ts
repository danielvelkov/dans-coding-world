import { IsInt, Min } from 'class-validator';
import { ToInteger } from '@dans-coding-world/validation';

export class DeleteCommentDto {
  @ToInteger()
  @Min(0)
  @IsInt()
  commentId: number;

  @ToInteger()
  @Min(0)
  @IsInt()
  postId: number;

  @ToInteger()
  @Min(0)
  @IsInt()
  authorId: number;
}
