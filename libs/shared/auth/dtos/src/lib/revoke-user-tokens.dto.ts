import { IsInt, Min } from 'class-validator';
import { ToInteger } from '@dans-coding-world/validation';

export class RevokeUserTokensDto {
  @ToInteger()
  @IsInt()
  @Min(0)
  userId: number;
}
