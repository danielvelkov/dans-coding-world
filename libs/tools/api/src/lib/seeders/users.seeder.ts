import users from '../data/users.json' with { type: 'json' };
import { client, Role, User } from '@dans-coding-world/prisma-schema';
import { hashPassword } from '@dans-coding-world/helpers';
import { SeedOptions } from './types/seed-options.js';

/**
 * @description ⚠️ **Test-only method.** This function is intended for development and testing purposes only.
 *
 * **🚨 Do not use in production.** It will delete existing user data.
 *
 * @param customUsers Users to create.
 * @param options Seed options for whether to clear and reset the 'User' table
 *
 * *DEFAULT DATA*:
 * - Id: 1 - **Admin**
 * - Id: 2 - **Mod**
 * - Id: 3 - **User**
 * - Id: 4 - **Author**
 */
export const seedUsers = async (
  customUsers?: User[],
  options: SeedOptions = { clearExisting: true, useDefaults: true },
): Promise<User[]> => {
  if (!(process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'test_e2e'))
    throw new Error(
      'Not in test environment. Check your test setup configuration.',
    );
  try {
    const seeded: User[] = [];

    if (options.clearExisting) {
      await client.$transaction(
        async (tx) => {
          await tx.$executeRaw`TRUNCATE TABLE "User" CASCADE`;
          await tx.$executeRaw`ALTER SEQUENCE "User_id_seq" RESTART WITH 1`;
          await tx.$executeRaw`ALTER SEQUENCE "Profile_id_seq" RESTART WITH 1`;
        },
        {
          isolationLevel: 'Serializable',
        },
      );
    }

    if (options.useDefaults) {
      const defaultUsers = await createAndReturnUsersWithId(users);
      seeded.push(...defaultUsers);
    }

    if (customUsers && Array.isArray(customUsers)) {
      const newUsers = await createAndReturnUsersWithId(customUsers);
      seeded.push(...newUsers);
    }
    return seeded;
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await client.$disconnect();
  }
};

const createAndReturnUsersWithId = async (users: any[]) => {
  if (!users.length) return [];

  const usersWithHashedPassword = await Promise.all(
    users.map(async (u) => {
      const password = await hashPassword(u.password);
      const data: User = {
        id: u.id,
        username: u.username,
        email: u.email,
        password,
        role: u.role as Role,
        isBanned: false,
      };
      if (typeof u.isBanned === 'boolean') data.isBanned = u.isBanned;
      return data;
    }),
  );

  const createdUsers = await client.$transaction(
    usersWithHashedPassword.map((user) => client.user.create({ data: user })),
  );
  return createdUsers.map((u, i) => ({ ...u, password: users[i].password }));
};
