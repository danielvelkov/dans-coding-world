import { IsInt, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { toInteger } from './custom-transformers/to-integer.js';

export class DeletePostDto {
  @Transform(toInteger)
  @Min(0)
  @IsInt()
  authorId: number;

  @Transform(toInteger)
  @Min(0)
  @IsInt()
  postId: number;
}
