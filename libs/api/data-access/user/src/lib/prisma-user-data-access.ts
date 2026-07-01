import { IUserRepository } from '@dans-coding-world/shared-data-access-interfaces';
import {
  UserWhereInput,
  client as prisma,
  User,
  Profile,
  UserOrderByInput,
} from '@dans-coding-world/prisma-schema';

export type UserDetail = User & { profile?: Profile };

export class PrismaUserDataAccess implements IUserRepository {
  async getById(id: string): Promise<User | null> {
    return await prisma.user.findFirst({
      where: {
        id: +id,
      },
      include: {
        profile: true,
      },
    });
  }

  async get(where: UserWhereInput): Promise<User | null> {
    return await prisma.user.findFirst({ where });
  }

  async search(
    where: UserWhereInput,
    orderBy?: UserOrderByInput,
    options?: {
      skip?: number;
      take?: number;
    },
  ): Promise<User[]> {
    return await prisma.user.findMany({
      where,
      orderBy,
      skip: options?.skip,
      take: options?.take,
      include: {
        profile: true,
      },
    });
  }

  async create(data: Omit<User, 'id'>): Promise<User> {
    return await prisma.user.create({ data });
  }

  async update(
    id: number,
    data: Partial<User>,
    profileData?: Partial<Profile>,
  ): Promise<User> {
    return await prisma.user.update({
      where: {
        id,
      },
      data: {
        ...data,
        profile: {
          update: {
            ...profileData,
          },
        },
      },
      include: {
        profile: true,
      },
    });
  }

  async exists(username: string, email: string): Promise<boolean> {
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ username }, { email }],
      },
    });

    return !!user;
  }

  async delete(id: number): Promise<User> {
    return await prisma.user.delete({
      where: {
        id,
      },
    });
  }

  async deleteMany(where: UserWhereInput): Promise<number> {
    const { count } = await prisma.user.deleteMany({
      where,
    });
    return count;
  }

  async count(where: UserWhereInput): Promise<number> {
    return await prisma.user.count({ where });
  }
}
