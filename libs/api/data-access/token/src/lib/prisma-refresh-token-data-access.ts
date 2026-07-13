import { client as prisma } from '@dans-coding-world/prisma-schema';
import type {
  RefreshToken,
  RefreshTokenWhereInput,
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
  async getAll(): Promise<RefreshToken[]> {
    return await prisma.refreshToken.findMany();
  }

  async create(
    jti: string,
    userId: string,
    expiresAt: Date,
  ): Promise<RefreshToken> {
    return await prisma.refreshToken.create({
      data: {
        jti,
        userId: Number(userId),
        expiresAt,
      },
    });
  }
  async update(
    jti: string,
    data: Partial<RefreshToken>,
  ): Promise<RefreshToken> {
    return await prisma.refreshToken.update({
      where: {
        jti,
      },
      data,
    });
  }
  async updateMany(
    where: RefreshTokenWhereInput,
    data: Partial<RefreshToken>,
  ): Promise<number> {
    const { count } = await prisma.refreshToken.updateMany({
      where,
      data,
    });
    return count;
  }
  async delete(jti: string): Promise<RefreshToken> {
    return await prisma.refreshToken.delete({
      where: {
        jti,
      },
    });
  }
  async deleteMany(where: RefreshTokenWhereInput): Promise<number> {
    const { count } = await prisma.refreshToken.deleteMany({ where });
    return count;
  }
}
