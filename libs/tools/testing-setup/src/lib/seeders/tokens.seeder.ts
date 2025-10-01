import users from '../data/users.json' with {type: "json"};
import { client, RefreshToken } from '@dans-coding-world/prisma-schema';
import { SeedOptions } from './types/seed-options.js';

export const seedRefreshTokens = async (
  customTokens?: Omit<RefreshToken, 'createdAt'>[],
  options: SeedOptions = { clearExisting: true, useDefaults: false }
): Promise<RefreshToken[]> => {
  try {
    const seeded: RefreshToken[] = [];
    if (options.clearExisting) {
      await client.refreshToken.deleteMany();
    }

    if (customTokens) {
      const tokens = customTokens.map((t) => {
        const user = users.find((u) => u.id === t.userId);
        if (user)
          return {
            ...t,
            createdAt: new Date(),
          };
        else throw new Error('Non-existent test user');
      });

      seeded.push(...tokens);

      await client.refreshToken.createMany({
        data: tokens,
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

export const getTokenById = async(jti: string) => {
  return await client.refreshToken.findFirstOrThrow({
    where:{
      jti
    }
  })
}

export const updateRefreshToken = async (
  data: RequireOnly<RefreshToken, 'jti'>
): Promise<RefreshToken> =>
  await client.refreshToken.update({
    where: { jti: data.jti },
    data,
  });

  type RequireOnly<T, K extends keyof T> =
  Partial<T> & Pick<T, K>;
