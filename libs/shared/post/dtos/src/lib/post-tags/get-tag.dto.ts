import { IsInt, Min } from 'class-validator';
import { ToInteger } from '@dans-coding-world/validation';

export class GetTagDto {
  @IsInt()
  @Min(0)
  @ToInteger()
  tagId: number;
}
