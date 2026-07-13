import { client } from '@dans-coding-world/prisma-schema';
import type { RefreshToken } from '@dans-coding-world/prisma-schema';
import { SeedOptions } from './types/seed-options.js';

/**
 * @description ⚠️ **Test-only method.** This function is intended for development and testing purposes only.
 *
 * **🚨 Do not use in production.** It will delete existing refresh token data.
 *
 * @param customTokens Tokens to create.
 * Make sure the users of the tokens exist, otherwise an error will be thrown
 * @param options Seed options for whether to clear and reset the 'RefreshToken' table
 */
export const seedRefreshTokens = async (
  customTokens?: Omit<RefreshToken, 'createdAt'>[],
  options: SeedOptions = { clearExisting: true },
): Promise<RefreshToken[]> => {
  if (!(process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'test_e2e'))
    throw new Error(
      'Not in test environment. Check your test setup configuration.',
    );
  try {
    const seeded: RefreshToken[] = [];
    if (options.clearExisting) {
      await client.refreshToken.deleteMany();
    }

    if (customTokens) {
      const tokens = customTokens.map((t) => {
        return {
          ...t,
          createdAt: new Date(),
        };
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
  }
};

export const getTokenById = async (jti: string) => {
  return await client.refreshToken.findFirstOrThrow({
    where: {
      jti,
    },
  });
};

export const updateRefreshToken = async (
  data: RequireOnly<RefreshToken, 'jti'>,
): Promise<RefreshToken> =>
  await client.refreshToken.update({
    where: { jti: data.jti },
    data,
  });

type RequireOnly<T, K extends keyof T> = Partial<T> & Pick<T, K>;
