import {
  RefreshToken,
  client as prisma,
} from '@dans-coding-world/prisma-schema';
import { IRefreshTokenRepository } from '@dans-coding-world/shared-data-access-interfaces';

class PrismaRefreshTokenDataAccess implements IRefreshTokenRepository {
  async get(token: string): Promise<RefreshToken | null> {
    return await prisma.refreshToken.findFirst({
      where: {
        token,
      },
    });
  }
  create(
    token: string,
    userId: string,
    expiresAt: Date
  ): Promise<RefreshToken> {
    return prisma.refreshToken.create({
      data: {
        token,
        userId: Number(userId),
        expiresAt,
      },
    });
  }
  update(data: RefreshToken): Promise<RefreshToken> {
    throw new Error('Method not implemented.');
  }
}

export const refreshTokenRepo = new PrismaRefreshTokenDataAccess();
