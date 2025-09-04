import { User } from '@dans-coding-world/prisma-schema';

export class LoginResponseDto {
  constructor(
    public accessToken: string,
    public refreshToken: string,
    public user: User
  ) {}
}
