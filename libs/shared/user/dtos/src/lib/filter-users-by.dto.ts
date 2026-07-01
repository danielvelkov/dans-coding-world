import { RoleEnum, type Role } from '@dans-coding-world/prisma-schema';
import { VALIDATION_MESSAGES } from '@dans-coding-world/shared-constants';
import { ToBoolean } from '@dans-coding-world/validation';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';

export class FilterUsersByDto {
  @IsOptional()
  @IsEnum(RoleEnum, {
    message: VALIDATION_MESSAGES.allowedValues(Object.values(RoleEnum)),
  })
  role?: Role;

  @IsOptional()
  @IsBoolean()
  @ToBoolean()
  isBanned?: boolean;
}
