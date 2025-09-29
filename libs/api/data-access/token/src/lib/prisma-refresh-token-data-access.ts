import {
  RefreshToken,
  client as prisma,
} from '@dans-coding-world/prisma-schema';
import { IRefreshTokenRepository } from '@dans-coding-world/shared-data-access-interfaces';

export class PrismaRefreshTokenDataAccess implements IRefreshTokenRepository {
  async getById(jti: string): Promise<RefreshToken | null> {
    return await prisma.refreshToken.findFirst({
      where: {
        jti,
      },
    });
  }

  async getUserTokens(userId: string): Promise<RefreshToken[] | null> {
    return await prisma.refreshToken.findMany({
      where: { userId: Number(userId) },
    });
  }

  async create(
    jti: string,
    userId: string,
    expiresAt: Date
  ): Promise<RefreshToken> {
    return await prisma.refreshToken.create({
      data: {
        jti,
        userId: Number(userId),
        expiresAt,
      },
    });
  }
  async update(data: RefreshToken): Promise<RefreshToken> {
    return await prisma.refreshToken.update({
      where: {
        jti: data.jti,
      },
      data,
    });
  }
  async delete(jti: string): Promise<RefreshToken> {
    return await prisma.refreshToken.delete({
      where: {
        jti,
      },
    });
  }
}
