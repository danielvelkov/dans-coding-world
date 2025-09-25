import { User } from '@dans-coding-world/prisma-schema';
export class RegistrationResponseDto {
  user: Omit<User, 'password'>;
}
