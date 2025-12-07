import { IsInt, Min } from 'class-validator';
import { ToInteger } from '@dans-coding-world/validation';

export class GetUserDto {
  @IsInt()
  @Min(0)
  @ToInteger()
  userId: number;
}
