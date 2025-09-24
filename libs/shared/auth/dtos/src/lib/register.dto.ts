import { Length, IsEmail, IsStrongPassword } from 'class-validator';
import { USER_CONSTRAINTS } from '@dans-coding-world/shared-constants';
export class RegisterDto {
  @Length(
    USER_CONSTRAINTS.MIN_USERNAME_LENGTH,
    USER_CONSTRAINTS.MAX_USERNAME_LENGTH
  )
  username: string;

  @IsEmail()
  email: string;

  @IsStrongPassword({
    minLength: USER_CONSTRAINTS.MIN_PASSWORD_LENGTH,
    minNumbers: USER_CONSTRAINTS.MIN_PASSWORD_NUMBER,
    minSymbols: USER_CONSTRAINTS.MIN_PASSWORD_SYMBOL,
    minUppercase: USER_CONSTRAINTS.MIN_PASSWORD_UPPERCASE,
  })
  password: string;
}
