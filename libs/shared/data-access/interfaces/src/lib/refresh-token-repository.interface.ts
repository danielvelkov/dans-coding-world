import { RefreshToken } from '@dans-coding-world/prisma-schema';

export interface IRefreshTokenRepository {
  get(token: string): Promise<RefreshToken | null>;
  getUserTokens(userId: string): Promise<RefreshToken[] | null>;
  create(token: string, userId: string, expiresAt: Date): Promise<RefreshToken>;
  update(data: RefreshToken): Promise<RefreshToken>;
  delete(data: RefreshToken): Promise<RefreshToken>;
}
