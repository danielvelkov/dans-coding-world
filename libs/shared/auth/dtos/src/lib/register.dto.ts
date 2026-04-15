import {
  IsEmail,
  IsStrongPassword,
  Matches,
  MinLength,
  MaxLength,
} from 'class-validator';
import {
  USER_CONSTRAINTS,
  VALIDATION_MESSAGES,
} from '@dans-coding-world/shared-constants';
export class RegisterDto {
  @MinLength(USER_CONSTRAINTS.MIN_USERNAME_LENGTH, {
    message: VALIDATION_MESSAGES.minLength(
      USER_CONSTRAINTS.MIN_USERNAME_LENGTH
    ),
  })
  @MaxLength(USER_CONSTRAINTS.MAX_USERNAME_LENGTH, {
    message: VALIDATION_MESSAGES.maxLength(
      USER_CONSTRAINTS.MAX_USERNAME_LENGTH
    ),
  })
  @Matches(USER_CONSTRAINTS.USERNAME_PATTERN, {
    message: VALIDATION_MESSAGES.username.invalid,
  })
  username: string;

  @IsEmail(undefined, { message: VALIDATION_MESSAGES.email.invalidEmail })
  email: string;

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
  password: string;
}
