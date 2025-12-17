import {
  USER_CONSTRAINTS,
  VALIDATION_MESSAGES,
} from '@dans-coding-world/shared-constants';
import { ToInteger } from '@dans-coding-world/validation';
import { IsString, IsInt, Max, IsEnum, Min, IsNotEmpty } from 'class-validator';

export class AvatarImageDto {
  @IsString()
  @IsNotEmpty()
  path: string;

  @IsString()
  @IsNotEmpty()
  @IsEnum(USER_CONSTRAINTS.AVATAR_IMAGE_ALLOWED_EXTENSIONS, {
    message: VALIDATION_MESSAGES.allowedExtensions([
      ...USER_CONSTRAINTS.AVATAR_IMAGE_ALLOWED_EXTENSIONS,
    ]),
  })
  extension: string;

  @IsInt()
  @ToInteger()
  @Min(0)
  @Max(USER_CONSTRAINTS.MAX_SIZE_AVATAR_IMAGE)
  size: number;
}
