import { IsOptional, IsInt, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { toInteger } from './custom-transformers/to-integer.js';
export class GetPostDto {
  @IsInt()
  @Min(0)
  @Transform(toInteger)
  postId: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Transform(toInteger)
  viewerId?: number;
}
