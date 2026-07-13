import type { User } from '@dans-coding-world/prisma-schema';

export class LoginResponseDto {
  accessToken: string;
  refreshToken: string;
  user: Omit<User, 'password'>;
}
