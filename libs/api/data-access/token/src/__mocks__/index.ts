import { IRefreshTokenRepository } from '@dans-coding-world/shared-data-access-interfaces';
import { RefreshToken } from '@dans-coding-world/prisma-schema';
class MockRefreshTokenDataAccess implements IRefreshTokenRepository {
  tokens: RefreshToken[] = [
    {
      token: '',
      userId: 1,
      revoked: false,
      expiresAt: new Date(),
      createdAt: new Date(),
    },
  ];
  async get(token: string): Promise<RefreshToken | null> {
    return this.tokens.find((t) => t.token === token) ?? null;
  }
  async create(
    token: string,
    userId: string,
    expiresAt: Date
  ): Promise<RefreshToken> {
    const existingToken = await this.get(token);

    if (existingToken) throw new Error('Refresh token already exists');

    const newToken = {
      token,
      userId: Number(userId),
      revoked: false,
      expiresAt,
      createdAt: new Date(),
    };

    this.tokens.push(newToken);
    return newToken;
  }
  update(data: RefreshToken): Promise<RefreshToken> {
    throw new Error('Method not implemented.');
  }
}

export const client = new MockRefreshTokenDataAccess();
