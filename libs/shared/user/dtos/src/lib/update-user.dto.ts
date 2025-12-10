import {
  IsInt,
  Min,
  MinLength,
  MaxLength,
  IsOptional,
  IsUrl,
  Matches,
} from 'class-validator';
import { ToInteger } from '@dans-coding-world/validation';
import {
  SHARED_CONSTANTS,
  USER_CONSTRAINTS,
  VALIDATION_MESSAGES,
} from '@dans-coding-world/shared-constants';

export class UpdateUserDto {
  @ToInteger()
  @Min(0)
  @IsInt()
  userId: number;

  @IsOptional()
  @MinLength(USER_CONSTRAINTS.MIN_FIRST_NAME_LENGTH, {
    message: VALIDATION_MESSAGES.minLength(
      USER_CONSTRAINTS.MIN_FIRST_NAME_LENGTH
    ),
  })
  @MaxLength(USER_CONSTRAINTS.MAX_FIRST_NAME_LENGTH, {
    message: VALIDATION_MESSAGES.maxLength(
      USER_CONSTRAINTS.MAX_FIRST_NAME_LENGTH
    ),
  })
  @Matches(USER_CONSTRAINTS.NAME_PATTERN, {
    message: VALIDATION_MESSAGES.name,
  })
  firstName?: string;

  @IsOptional()
  @MinLength(USER_CONSTRAINTS.MIN_LAST_NAME_LENGTH, {
    message: VALIDATION_MESSAGES.minLength(
      USER_CONSTRAINTS.MIN_LAST_NAME_LENGTH
    ),
  })
  @MaxLength(USER_CONSTRAINTS.MAX_LAST_NAME_LENGTH, {
    message: VALIDATION_MESSAGES.maxLength(
      USER_CONSTRAINTS.MAX_LAST_NAME_LENGTH
    ),
  })
  @Matches(USER_CONSTRAINTS.NAME_PATTERN, {
    message: VALIDATION_MESSAGES.name,
  })
  lastName?: string;

  @IsOptional()
  @MinLength(USER_CONSTRAINTS.MIN_BIO_LENGTH, {
    message: VALIDATION_MESSAGES.minLength(USER_CONSTRAINTS.MIN_BIO_LENGTH),
  })
  @MaxLength(USER_CONSTRAINTS.MAX_BIO_LENGTH, {
    message: VALIDATION_MESSAGES.maxLength(USER_CONSTRAINTS.MAX_BIO_LENGTH),
  })
  bio?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(SHARED_CONSTANTS.MAX_URL_LENGTH, {
    message: VALIDATION_MESSAGES.maxLength(SHARED_CONSTANTS.MAX_URL_LENGTH),
  })
  avatarURL?: string;
}
