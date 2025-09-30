import {
  RefreshToken,
  RefreshTokenWhereInput,
} from '@dans-coding-world/prisma-schema';

export interface IRefreshTokenRepository {
  getById(jti: string): Promise<RefreshToken | null>;
  getUserTokens(userId: string): Promise<RefreshToken[] | null>;
  getAll(): Promise<RefreshToken[]>;
  create(jti: string, userId: string, expiresAt: Date): Promise<RefreshToken>;
  update(data: RefreshToken): Promise<RefreshToken>;
  updateMany(data: RefreshToken[]): Promise<number>;
  delete(jti: string): Promise<RefreshToken>;
  deleteMany(where: RefreshTokenWhereInput): Promise<number>;
}
