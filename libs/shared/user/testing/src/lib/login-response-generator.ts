import { BaseResponse } from '@dans-coding-world/api-types';
import { generateRandomUser } from './user-generator.js';
import { User } from '@dans-coding-world/prisma-schema';

export function generateMockLoginResponse({
  user,
}: {
  user?: Partial<Omit<User, 'password'>>;
}): BaseResponse<{ user: Omit<User, 'password'> }> {
  const { profile, password, ...userDetails } = generateRandomUser();
  return {
    error: null,
    success: true,
    data: {
      user: {
        ...userDetails,
        ...user,
      },
    },
  };
}
