import { IsInt, Min } from 'class-validator';
export class DeletePostDto {
  @Min(0)
  @IsInt()
  authorId: number;

  @Min(0)
  @IsInt()
  postId: number;
}
