import { IRefreshTokenRepository } from '@dans-coding-world/shared-data-access-interfaces';
import { RefreshToken } from '@dans-coding-world/prisma-schema';
export class MockRefreshTokenDataAccess implements IRefreshTokenRepository {
  tokens: RefreshToken[] = [];

  async getById(jti: string): Promise<RefreshToken | null> {
    return this.tokens.find((t) => t.jti === jti) ?? null;
  }
  async getUserTokens(userId: string): Promise<RefreshToken[] | null> {
    return this.tokens.filter((t) => t.userId.toString() === userId);
  }
  async create(
    jti: string,
    userId: string,
    expiresAt: Date
  ): Promise<RefreshToken> {
    const existingToken = await this.getById(jti);

    if (existingToken) throw new Error('Refresh token already exists');

    const newToken = {
      jti,
      userId: Number(userId),
      revoked: false,
      expiresAt,
      createdAt: new Date(),
    };

    this.tokens.push(newToken);
    return newToken;
  }
  async update(data: RefreshToken): Promise<RefreshToken> {
    const existingToken = await this.getById(data.jti);

    if (!existingToken) throw new Error('Refresh token does not exist');
    this.tokens = this.tokens.map((t) => (t.jti === data.jti ? data : t));
    return existingToken;
  }
  async delete(jti: string): Promise<RefreshToken> {
    const existingToken = await this.getById(jti);

    if (!existingToken) throw new Error('Refresh token does not exist');
    this.tokens = this.tokens.filter((t) => t.jti !== jti);
    return existingToken;
  }
}
