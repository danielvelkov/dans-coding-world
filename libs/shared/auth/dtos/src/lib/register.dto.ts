import {
  Length,
  IsEmail,
  IsStrongPassword,
  IsString,
  Matches,
} from 'class-validator';
import { USER_CONSTRAINTS } from '@dans-coding-world/shared-constants';
export class RegisterDto {
  @IsString()
  @Length(
    USER_CONSTRAINTS.MIN_USERNAME_LENGTH,
    USER_CONSTRAINTS.MAX_USERNAME_LENGTH
  )
  @Matches(/^[a-zA-z0-9_]+$/)
  username: string;

  @IsEmail()
  email: string;

  @IsStrongPassword({
    minNumbers: USER_CONSTRAINTS.MIN_PASSWORD_NUMBER,
    minSymbols: USER_CONSTRAINTS.MIN_PASSWORD_SYMBOL,
    minUppercase: USER_CONSTRAINTS.MIN_PASSWORD_UPPERCASE,
  })
  @Length(
    USER_CONSTRAINTS.MIN_PASSWORD_LENGTH,
    USER_CONSTRAINTS.MAX_PASSWORD_LENGTH
  )
  password: string;
}
