import { IsOptional, IsInt, Min } from 'class-validator';
import { ToInteger } from '@dans-coding-world/validation';
export class GetPostDto {
  @IsInt()
  @Min(0)
  @ToInteger()
  postId: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @ToInteger()
  viewerId?: number;
}
