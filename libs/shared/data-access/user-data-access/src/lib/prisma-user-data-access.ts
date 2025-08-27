import { IUserService } from '@dans-coding-world/util-interfaces';
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
console.log(
  'USER DATA ACCESS IN : ',
  process.env.NODE_ENV === 'test' ? '### TEST ENV ###' : '### DEV ENV ###'
);
export const client = new PrismaUserDataAccess();
