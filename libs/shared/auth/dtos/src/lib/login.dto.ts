import { VALIDATION_MESSAGES } from '@dans-coding-world/shared-constants';
import { IsEmail, IsNotEmpty } from 'class-validator';
export class LoginDto {
  @IsEmail(undefined, { message: VALIDATION_MESSAGES.email.invalidEmail })
  email: string;

  @IsNotEmpty({ message: VALIDATION_MESSAGES.required })
  password: string;
}
