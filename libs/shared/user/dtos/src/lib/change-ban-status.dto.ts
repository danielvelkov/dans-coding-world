import { IsBoolean, IsInt, Min } from 'class-validator';
import { ToInteger } from '@dans-coding-world/validation';
import { ToBoolean } from '@dans-coding-world/validation';

export class ChangeBanStatusDto {
  @ToInteger()
  @Min(0)
  @IsInt()
  userId: number;

  @ToInteger()
  @Min(0)
  @IsInt()
  userToChangeId: number;

  @IsBoolean()
  @ToBoolean()
  isBanned: boolean;
}
