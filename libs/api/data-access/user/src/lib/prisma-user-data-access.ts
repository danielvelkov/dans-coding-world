import { IUserRepository } from '@dans-coding-world/shared-data-access-interfaces';
import {
  UserWhereInput,
  client as prisma,
  User,
  Profile,
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

  async create(data: Omit<User, 'id'>): Promise<User> {
    return await prisma.user.create({ data });
  }

  async update(
    id: number,
    data: Partial<User>,
    profileData?: Partial<Profile>
  ): Promise<User> {
    const updatePayload: any = {
      ...data,
    };

    if (profileData) {
      updatePayload.profile = {
        upsert: {
          update: profileData,
          create: profileData,
        },
      };
    }
    return await prisma.user.update({
      where: {
        id,
      },
      data: updatePayload,
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
}
