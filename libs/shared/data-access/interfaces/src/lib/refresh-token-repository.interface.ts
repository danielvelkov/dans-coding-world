import { RefreshToken } from '@dans-coding-world/prisma-schema';

export interface IRefreshTokenRepository {
  getById(jti: string): Promise<RefreshToken | null>;
  getUserTokens(userId: string): Promise<RefreshToken[] | null>;
  create(jti: string, userId: string, expiresAt: Date): Promise<RefreshToken>;
  update(data: RefreshToken): Promise<RefreshToken>;
  delete(jti: string): Promise<RefreshToken>;
}
