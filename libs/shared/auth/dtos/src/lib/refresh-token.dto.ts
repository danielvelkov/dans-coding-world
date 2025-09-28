import { VALIDATION_MESSAGES } from '@dans-coding-world/shared-constants';
import { IsJWT } from 'class-validator';
export class RefreshTokenDto {
  @IsJWT({ message: VALIDATION_MESSAGES.token.invalid })
  token: string;
}
