import { IsInt, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { toInteger } from '../custom-transformers/to-integer.js';

export class DeleteTagDto {
  @Transform(toInteger)
  @Min(0)
  @IsInt()
  tagId: number;
}
