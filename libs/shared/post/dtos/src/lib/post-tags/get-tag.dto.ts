import { IsInt, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { toInteger } from '../custom-transformers/to-integer.js';

export class GetTagDto {
  @IsInt()
  @Min(0)
  @Transform(toInteger)
  tagId: number;
}
