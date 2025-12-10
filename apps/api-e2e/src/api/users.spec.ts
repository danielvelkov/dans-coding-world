import {
  Profile,
  RefreshToken,
  User,
  client as prisma,
} from '@dans-coding-world/prisma-schema';
import {
  seedRefreshTokens,
  seedUsers,
  getTokenById,
} from '@dans-coding-world/testing-setup';
import { createUsersRouteHelper } from '../helper/users-request.helper';
import { BaseResponse } from '@dans-coding-world/api-types';
import {
  ERROR_CODES,
  SUCCESS_MESSAGES,
} from '@dans-coding-world/shared-constants';
import { createAuthRouteHelper } from '../helper/auth-request.helper';
import { createAxiosClient } from '../helper/test-client.helper';
import { testInvalidIds } from '../helper/validation.helper';
import { AxiosInstance, AxiosResponse } from 'axios';
import { createErrorCodeResponse } from '../helper/error-response.helper';
import { UserDetail } from '@dans-coding-world/user-data-access';

describe('/api/v1/users', () => {
  let client: AxiosInstance;
  let login: (
    email: string,
    password: string
  ) => Promise<AxiosResponse<BaseResponse>>;
  let getUser: (id: string) => Promise<AxiosResponse<unknown>>;
  let revokeUserTokens: (id: string) => Promise<AxiosResponse<unknown>>;

  let users: User[] = [];
  let refreshTokens: RefreshToken[] = [];

  let admin: User;
  let mod: User;
  let author: User;
  let user: User;

  let userProfile: Profile;

  beforeAll(async () => {
    users = await seedUsers();

    admin = users.find((u) => u.role === 'ADMIN') as User;
    author = users.find((u) => u.role === 'AUTHOR') as User;
    user = users.find((u) => u.role === 'USER') as User;
    mod = users.find((u) => u.role === 'MOD') as User;

    if (!admin || !author || !user || !mod) throw new Error('Missing users');

    userProfile = await prisma.profile.create({
      data: {
        userId: user.id,
        firstName: 'John',
        lastName: 'Doe',
        bio: 'Do not look for me',
        avatarURL: 'some.image.site/1',
      },
    });
  });

  beforeEach(async () => {
    client = createAxiosClient();
    ({ login } = createAuthRouteHelper(client));

    ({ revokeUserTokens, getUser } = createUsersRouteHelper(client));
  });

  describe('GET /api/v1/users/:id', () => {
    it(`should return user with profile details, but without email if 
      logged-in user isn't the owner of the account, ADMIN or MOD`, async () => {
      await login(author.email, author.password);
      const res = await getUser(user.id.toString());
      const { data } = res.data as BaseResponse;

      expect(data).toHaveProperty('message', SUCCESS_MESSAGES.USERS.get);

      const userData = (data as any).user as UserDetail;
      expect(userData.id).toBe(user.id);
      expect(userData.username).toBe(user.username);

      expect(userData.email).not.toBeDefined();
      expect(userData.password).not.toBeDefined();

      expect(userData.profile).toBeDefined();
      expect(userData.profile).toEqual(userProfile);
    });

    test.each([
      ['owner of the account', 'USER'],
      ['an ADMIN', 'ADMIN'],
      ['a MOD', 'MOD'],
    ])('should return email when user is %s', async (_, role) => {
      const viewer = users.find((u) => u.role === role);
      if (!viewer) throw new Error('Missing test user');

      await login(viewer.email, viewer.password);

      const res = await getUser(user.id.toString());
      const { data } = res.data as BaseResponse;

      const userData = (data as any).user as User;
      expect(userData.email).toBe(user.email);
    });

    testInvalidIds((id) => getUser(id), 'user id');

    it('should return 404 NOT FOUND for unknown user id', async () => {
      await login(admin.email, admin.password);
      return await expect(getUser('999')).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.NOT_FOUND)
      );
    });
  });

  describe('POST /api/v1/users/:userId/revoke-tokens', () => {
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
