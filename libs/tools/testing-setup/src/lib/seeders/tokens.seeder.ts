import users from '../data/users.json' with {type: "json"};
import { client, RefreshToken } from '@dans-coding-world/prisma-schema';
import { hashPassword } from '@dans-coding-world/api-auth';
import { SeedOptions } from './types/seed-options.js';
import {
  TokenService,
  config,
  AUTH_CONFIG_TOKEN,
} from '@dans-coding-world/api-auth';

import { ReflectiveInjector } from 'injection-js';

const injector = ReflectiveInjector.resolveAndCreate([
  TokenService,
  { provide: AUTH_CONFIG_TOKEN, useValue: config },
]);

const tokenService = injector.get(TokenService) as TokenService;

export const seedRefreshTokens = async (
  customTokens?: Omit<RefreshToken, 'createdAt' | 'token'>[],
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
            token: tokenService.generateRefreshToken(
              { ...user, role: 'USER' },
              {
                expiresIn: config.options.refreshExpiration,
                secret: config.options.refreshSecret,
              }
            ),
          };
        else throw new Error('Non-existent test user');
      });

      seeded.push(...tokens);

      await client.refreshToken.createMany({
        data: await Promise.all(
          tokens.map(async (t) => ({
            ...t,
            token: await hashPassword(t.token),
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
