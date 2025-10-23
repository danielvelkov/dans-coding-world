import { IsInt, Min, IsOptional } from 'class-validator';

export class GetPostCommentRepliesDto {
  @IsInt()
  @Min(0)
  commentId: number;

  @IsInt()
  @Min(0)
  postId: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  viewerId?: number;
}
