import { Length, IsEmail, IsStrongPassword } from 'class-validator';
export class RegisterDto {
  @Length(5, 20)
  username: string;

  @IsEmail()
  email: string;

  @IsStrongPassword({
    minLength: 8,
    minNumbers: 1,
    minSymbols: 1,
    minUppercase: 1,
  })
  password: string;
}
