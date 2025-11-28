import { IsInt, IsOptional, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { ToInteger } from '@dans-coding-world/validation';

export class GetTagsDto {
  @IsOptional()
  @ToInteger()
  @IsInt()
  @Min(0)
  viewerId?: number;
}
