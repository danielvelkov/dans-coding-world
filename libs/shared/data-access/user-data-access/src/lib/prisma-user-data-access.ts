import { IUserService } from '@dans-coding-world/shared-data-access-interfaces';
import {
  UserWhereInput,
  client as prisma,
  User,
} from '@dans-coding-world/prisma-schema';
class PrismaUserDataAccess implements IUserService {
  async getById(id: string): Promise<User | null> {
    return await prisma.user.findFirst({
      where: {
        id: +id,
      },
    });
  }

  async get(where: UserWhereInput): Promise<User | null> {
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

  async create(data: Omit<User, 'id'>): Promise<User> {
    return await prisma.user.create({ data });
  }
}

export const client = new PrismaUserDataAccess();
