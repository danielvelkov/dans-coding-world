import { IsInt, Min } from 'class-validator';
import { ToInteger } from '@dans-coding-world/validation';

export class DeleteUserDto {
  @ToInteger()
  @Min(0)
  @IsInt()
  userId: number;

  @ToInteger()
  @Min(0)
  @IsInt()
  userToDeleteId: number;
}
