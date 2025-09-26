import users from '../data/users.json' with {type: "json"};
import { client, Role, User } from '@dans-coding-world/prisma-schema';
import { hashPassword } from '@dans-coding-world/api-auth';
import { SeedOptions } from './types/seed-options.js';

export const seedUsers = async (
  customUsers?: User[],
  options: SeedOptions = { clearExisting: true, useDefaults: true }
): Promise<User[]> => {
  try {
    const seeded: User[] = [];

    if (options.clearExisting) {
      await client.user.deleteMany();
      await client.$queryRaw`ALTER SEQUENCE "User_id_seq" RESTART WITH 1;`;
    }

    if (options.useDefaults) {
      const defaultUsers = users.map((u) => ({ ...u, role: u.role as Role }));

      seeded.push(...defaultUsers);
      await client.user.createMany({
        data: await Promise.all(
          defaultUsers.map(async (u) => ({
            ...u,
            password: await hashPassword(u.password),
          }))
        ),
      });
    }

    if (customUsers) {
      seeded.push(...customUsers);

      await client.user.createMany({
        data: await Promise.all(
          customUsers.map(async (u) => ({
            ...u,
            password: await hashPassword(u.password),
          }))
        ),
      });
    }
    return seeded;
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await client.$disconnect();
  }
};
