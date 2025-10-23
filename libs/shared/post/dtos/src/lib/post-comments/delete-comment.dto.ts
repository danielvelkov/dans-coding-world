import { IsInt, Min } from 'class-validator';
export class DeleteCommentDto {
  @Min(0)
  @IsInt()
  commentId: number;

  @Min(0)
  @IsInt()
  postId: number;

  @Min(0)
  @IsInt()
  authorId: number;
}
