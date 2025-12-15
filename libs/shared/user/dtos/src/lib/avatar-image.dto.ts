import {
  USER_CONSTRAINTS,
  VALIDATION_MESSAGES,
} from '@dans-coding-world/shared-constants';
import { IsString, IsInt, Max, IsEnum } from 'class-validator';

export class AvatarImageDto {
  @IsString()
  path: string;

  @IsString()
  @IsEnum(USER_CONSTRAINTS.AVATAR_IMAGE_ALLOWED_EXTENSIONS, {
    message: VALIDATION_MESSAGES.allowedExtensions([
      ...USER_CONSTRAINTS.AVATAR_IMAGE_ALLOWED_EXTENSIONS,
    ]),
  })
  extension: string;

  @IsInt()
  @Max(USER_CONSTRAINTS.MAX_SIZE_AVATAR_IMAGE)
  size: number;
}
