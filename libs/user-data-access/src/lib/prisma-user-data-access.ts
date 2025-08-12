import { IUserService } from '@dans-coding-world/util-interfaces';
import { UserWhereInput, prisma } from '@dans-coding-world/prisma-schema';
class PrismaUserDataAccess implements IUserService {
  getById(id: string): Promise<{
    id: number;
    username: string;
    email: string;
    password: string;
  } | null> {
    return prisma.user.findFirst({
      where: {
        id: +id,
      },
    });
  }

  get(where: UserWhereInput): Promise<{
    id: number;
    username: string;
    email: string;
    password: string;
  } | null> {
    return prisma.user.findFirst({ where });
  }

  exists(username: string, email: string): boolean {
    return !!prisma.user.findFirst({
      where: {
        OR: [
          {
            username: username,
          },
          {
            email: email,
          },
        ],
      },
    });
  }

  create(
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
    return prisma.user.create({ data });
  }
}
export const client = new PrismaUserDataAccess();
