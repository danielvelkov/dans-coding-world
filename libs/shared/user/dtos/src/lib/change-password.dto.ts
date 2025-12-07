import {
  IsInt,
  Min,
  IsStrongPassword,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ToInteger } from '@dans-coding-world/validation';
import {
  USER_CONSTRAINTS,
  VALIDATION_MESSAGES,
} from '@dans-coding-world/shared-constants';
export class ChangePasswordDto {
  @ToInteger()
  @Min(0)
  @IsInt()
  userId: number;

  @IsStrongPassword(
    {
      minNumbers: USER_CONSTRAINTS.MIN_PASSWORD_NUMBER,
      minSymbols: USER_CONSTRAINTS.MIN_PASSWORD_SYMBOL,
      minUppercase: USER_CONSTRAINTS.MIN_PASSWORD_UPPERCASE,
    },
    {
      message: VALIDATION_MESSAGES.password.weak,
    }
  )
  @MinLength(USER_CONSTRAINTS.MIN_PASSWORD_LENGTH, {
    message: VALIDATION_MESSAGES.minLength(
      USER_CONSTRAINTS.MIN_PASSWORD_LENGTH
    ),
  })
  @MaxLength(USER_CONSTRAINTS.MAX_PASSWORD_LENGTH, {
    message: VALIDATION_MESSAGES.maxLength(
      USER_CONSTRAINTS.MAX_PASSWORD_LENGTH
    ),
  })
  oldPassword: string;

  @IsStrongPassword(
    {
      minNumbers: USER_CONSTRAINTS.MIN_PASSWORD_NUMBER,
      minSymbols: USER_CONSTRAINTS.MIN_PASSWORD_SYMBOL,
      minUppercase: USER_CONSTRAINTS.MIN_PASSWORD_UPPERCASE,
    },
    {
      message: VALIDATION_MESSAGES.password.weak,
    }
  )
  @MinLength(USER_CONSTRAINTS.MIN_PASSWORD_LENGTH, {
    message: VALIDATION_MESSAGES.minLength(
      USER_CONSTRAINTS.MIN_PASSWORD_LENGTH
    ),
  })
  @MaxLength(USER_CONSTRAINTS.MAX_PASSWORD_LENGTH, {
    message: VALIDATION_MESSAGES.maxLength(
      USER_CONSTRAINTS.MAX_PASSWORD_LENGTH
    ),
  })
  newPassword: string;
}
