import { IRefreshTokenRepository } from '@dans-coding-world/shared-data-access-interfaces';
import {
  RefreshToken,
  RefreshTokenWhereInput,
} from '@dans-coding-world/prisma-schema';
export class MockRefreshTokenDataAccess implements IRefreshTokenRepository {
  tokens: RefreshToken[] = [];

  async getAll(): Promise<RefreshToken[]> {
    return this.tokens;
  }
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
  async update(jti: string, data: RefreshToken): Promise<RefreshToken> {
    const existingToken = await this.getById(jti);

    if (!existingToken) throw new Error('Refresh token does not exist');
    this.tokens = this.tokens.map((t) =>
      t.jti === jti ? { ...t, ...data } : t
    );
    return { ...existingToken, ...data };
  }
  async updateMany(
    where: RefreshTokenWhereInput,
    data: RefreshToken
  ): Promise<number> {
    const jtiForUpdate = this.tokens
      .filter((t) => {
        // TODO: this is not gonna work unfortunately
        if ('userId' in where) return t.userId === where.userId;
        else if ('revoked' in where) return t.revoked === where.revoked;
        else if (Object.keys(where).length === 0) return true; // No where filter so get all
        return false;
      })
      .map((t) => t.jti);

    this.tokens = this.tokens.map((t) => {
      if (jtiForUpdate.includes(t.jti)) return { ...t, ...data };
      else return t;
    });
    return jtiForUpdate.length;
  }
  async delete(jti: string): Promise<RefreshToken> {
    const existingToken = await this.getById(jti);

    if (!existingToken) throw new Error('Refresh token does not exist');
    this.tokens = this.tokens.filter((t) => t.jti !== jti);
    return existingToken;
  }
  async deleteMany(where: RefreshTokenWhereInput): Promise<number> {
    this.tokens = this.tokens.filter((t) => t.jti === where.jti);
    return this.tokens.length;
  }
}
