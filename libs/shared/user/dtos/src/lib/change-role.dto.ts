import type { Role } from '@dans-coding-world/prisma-schema';
import { RoleEnum } from '@dans-coding-world/prisma-schema';
import { IsEnum, IsInt, Min } from 'class-validator';
import { ToInteger } from '@dans-coding-world/validation';
import { VALIDATION_MESSAGES } from '@dans-coding-world/shared-constants';

export class ChangeRoleDto {
  @ToInteger()
  @Min(0)
  @IsInt()
  userId: number;

  @IsEnum(RoleEnum, {
    message: VALIDATION_MESSAGES.allowedValues(
      Object.values(RoleEnum).filter((r) => r !== 'ADMIN')
    ),
  })
  status: Role;
}
