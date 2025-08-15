import { IUserService } from '@dans-coding-world/util-interfaces';
import { UserWhereInput, prisma } from '@dans-coding-world/prisma-schema';
class PrismaUserDataAccess implements IUserService {
  async getById(id: string): Promise<{
    id: number;
    username: string;
    email: string;
    password: string;
  } | null> {
    return await prisma.user.findFirst({
      where: {
        id: +id,
      },
    });
  }

  async get(where: UserWhereInput): Promise<{
    id: number;
    username: string;
    email: string;
    password: string;
  } | null> {
    return await prisma.user.findFirst({ where });
  }

  async exists(username: string, email: string): Promise<boolean> {
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ username }, { email }],
      },
    });

    return !!user;
  }

  async create(
    data: Omit<
      { id: number; username: string; email: string; password: string },
      'id'
    >
  ): Promise<{
    id: number;
    username: string;
    email: string;
    password: string;
  }> {
    return await prisma.user.create({ data });
  }
}
export const client = new PrismaUserDataAccess();
