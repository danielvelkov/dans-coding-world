import { IsInt, IsOptional, Min } from 'class-validator';
import { ToInteger } from '@dans-coding-world/validation';

export class GetTagsDto {
  @IsOptional()
  @ToInteger()
  @IsInt()
  @Min(0)
  viewerId?: number;
}
