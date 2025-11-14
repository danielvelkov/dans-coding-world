import { IsInt, IsOptional, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { toInteger } from '../custom-transformers/to-integer.js';

export class GetTagsDto {
  @IsOptional()
  @Transform(toInteger)
  @IsInt()
  @Min(0)
  viewerId?: number;
}
