import {
  RefreshToken,
  client as prisma,
} from '@dans-coding-world/prisma-schema';
import { IRefreshTokenRepository } from '@dans-coding-world/shared-data-access-interfaces';

export class PrismaRefreshTokenDataAccess implements IRefreshTokenRepository {
  async get(token: string): Promise<RefreshToken | null> {
    return await prisma.refreshToken.findFirst({
      where: {
        token,
      },
    });
  }

  async getUserTokens(userId: string): Promise<RefreshToken[] | null> {
    return await prisma.refreshToken.findMany({
      where: { userId: Number(userId) },
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
  async delete(data: RefreshToken): Promise<RefreshToken> {
    return await prisma.refreshToken.delete({
      where: {
        ...data,
      },
    });
  }
}
