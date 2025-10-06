import { RefreshToken, User } from '@dans-coding-world/prisma-schema';
import {
  seedRefreshTokens,
  seedUsers,
  getTokenById,
} from '@dans-coding-world/testing-setup';
import { createUsersHelpers } from '../helper/users.helper';
import { BaseResponse } from '@dans-coding-world/api-types';
import { SUCCESS_MESSAGES } from '@dans-coding-world/shared-constants';
import { createAuthHelpers } from '../helper/auth-request.helper';
import { createAxiosClient } from '../helper/test-client.helper';

describe('/api/v1/users', () => {
  const client = createAxiosClient();
  const { login } = createAuthHelpers(client);
  const { revokeUserTokens } = createUsersHelpers(client);
  let users: User[] = [];
  let refreshTokens: RefreshToken[] = [];
  describe('POST /api/v1/users/:userId/revokeUserTokens', () => {
    beforeAll(async () => {
      users = await seedUsers();
    });
    beforeEach(async () => {
      const user = users.find((u) => u.role === 'USER');
      if (!user) throw new Error('Missing test user');
      refreshTokens = await seedRefreshTokens([
        {
          expiresAt: new Date(Date.now()),
          revoked: false,
          jti: '1',
          userId: user.id,
        },
      ]);
    });
    it('should revoke all tokens related to user', async () => {
      const user = users.find((u) => u.role === 'USER');
      const admin = users.find((u) => u.role === 'ADMIN');
      if (!admin || !user) throw new Error('Missing test user');

      await login(admin.email, admin.password);

      const res = await revokeUserTokens(user.id.toString());
      const { data: revokeData } = res.data as BaseResponse;
      if (!revokeData) throw new Error('Missing data');

      expect(revokeData).toHaveProperty(
        'message',
        SUCCESS_MESSAGES.AUTH.revoke
      );
      expect(revokeData).toHaveProperty('revokedCount', 1);
      expect((await getTokenById(refreshTokens[0].jti)).revoked).toBe(true);
    });
    it('should return no revoked tokens when user does not exist', async () => {
      const admin = users.find((u) => u.role === 'ADMIN');
      if (!admin) throw new Error('Missing test user');

      await login(admin.email, admin.password);

      const res = await revokeUserTokens('9999');
      const { data: revokeData } = res.data as BaseResponse;
      if (!revokeData) throw new Error('Missing data');

      expect(revokeData).toHaveProperty(
        'message',
        SUCCESS_MESSAGES.AUTH.revoke
      );
      expect(revokeData).toHaveProperty('revokedCount', 0);
    });
  });
});
