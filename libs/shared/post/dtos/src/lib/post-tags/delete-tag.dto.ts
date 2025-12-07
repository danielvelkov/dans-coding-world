import { IsInt, Min } from 'class-validator';
import { ToInteger } from '@dans-coding-world/validation';

export class DeleteTagDto {
  @ToInteger()
  @Min(0)
  @IsInt()
  tagId: number;
}
