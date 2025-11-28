import { IsInt, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { ToInteger } from '@dans-coding-world/validation';

export class DeletePostDto {
  @ToInteger()
  @Min(0)
  @IsInt()
  authorId: number;

  @ToInteger()
  @Min(0)
  @IsInt()
  postId: number;
}
