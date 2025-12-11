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
  USER_CONSTRAINTS,
  VALIDATION_MESSAGES,
} from '@dans-coding-world/shared-constants';
import { createAuthRouteHelper } from '../helper/auth-request.helper';
import { createAxiosClient } from '../helper/test-client.helper';
import { testInvalidIds } from '../helper/validation.helper';
import { AxiosInstance, AxiosResponse } from 'axios';
import { createErrorCodeResponse } from '../helper/error-response.helper';
import { UserDetail } from '@dans-coding-world/user-data-access';
import {
  ChangePasswordDto,
  ChangeRoleDto,
  UpdateUserDto,
} from '@dans-coding-world/shared-user-dto';
import { generateRandomString } from '@dans-coding-world/helpers';
import { passwordGenerator, validPassword } from '@dans-coding-world/api-auth';

describe('/api/v1/users', () => {
  let client: AxiosInstance;
  let login: (
    email: string,
    password: string
  ) => Promise<AxiosResponse<BaseResponse>>;
  let getUser: (id: string) => Promise<AxiosResponse<unknown>>;
  let updateUser: (
    profileData: Omit<UpdateUserDto, 'userId'>
  ) => Promise<AxiosResponse<unknown>>;
  let changePassword: (
    profileData: Omit<ChangePasswordDto, 'userId'>
  ) => Promise<AxiosResponse<unknown>>;
  let deleteUser: (id: string) => Promise<AxiosResponse<unknown>>;
  let revokeUserTokens: (id: string) => Promise<AxiosResponse<unknown>>;
  let changeUserRole: (
    id: string,
    changeRoleData: Omit<ChangeRoleDto, 'userId'>
  ) => Promise<AxiosResponse<unknown>>;

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

    ({
      revokeUserTokens,
      getUser,
      updateUser,
      changePassword,
      deleteUser,
      changeUserRole,
    } = createUsersRouteHelper(client));
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

  describe('PATCH /api/v1/users', () => {
    it(`should update logged-in user's profile details if valid`, async () => {
      const NEW_PROFILE_DATA = {
        firstName: 'Bingus',
        lastName: 'Dingus',
      };
      await login(user.email, user.password);

      const res = await updateUser(NEW_PROFILE_DATA);
      const { data } = res.data as BaseResponse;
      expect(data).toHaveProperty('message', SUCCESS_MESSAGES.USERS.update);

      const userData = (data as any).user as UserDetail;
      expect(userData.profile?.firstName).toBe(NEW_PROFILE_DATA.firstName);
      expect(userData.profile?.lastName).toBe(NEW_PROFILE_DATA.lastName);

      expect(userData.profile?.bio).toBe(userProfile.bio);
    });

    it(`should create profile details when updating if user does not have one`, async () => {
      const NEW_PROFILE_DATA = {
        firstName: 'Bingus',
        lastName: 'Dingus',
      };
      await login(author.email, author.password);

      const res_get = await getUser(author.id.toString());
      const { data: getUserData } = res_get.data as BaseResponse;
      const oldProfile = (getUserData as any).profile as UserDetail;

      expect(oldProfile).not.toBeDefined();

      const res = await updateUser(NEW_PROFILE_DATA);
      const { data } = res.data as BaseResponse;

      const userData = (data as any).user as UserDetail;
      expect(userData.profile?.firstName).toBe(NEW_PROFILE_DATA.firstName);
      expect(userData.profile?.lastName).toBe(NEW_PROFILE_DATA.lastName);

      // Set other fields to empty string
      expect(userData.profile?.bio).toBe('');
      expect(userData.profile?.avatarURL).toBe('');
    });

    it('should return 401 UNAUTHORIZED when not logged in', async () => {
      return await expect(
        updateUser({
          firstName: 'Jon',
        })
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.AUTH.UNAUTHORIZED)
      );
    });

    test.each([
      [
        'first name is too long',
        {
          firstName: generateRandomString(
            USER_CONSTRAINTS.MAX_FIRST_NAME_LENGTH + 1
          ),
        },
      ],
      [
        'first name is too short',
        {
          firstName: generateRandomString(
            USER_CONSTRAINTS.MIN_FIRST_NAME_LENGTH - 1
          ),
        },
      ],
      [
        'last name is too long',
        {
          lastName: generateRandomString(
            USER_CONSTRAINTS.MAX_LAST_NAME_LENGTH + 1
          ),
        },
      ],
      [
        'last name is too short',
        {
          lastName: generateRandomString(
            USER_CONSTRAINTS.MIN_LAST_NAME_LENGTH - 1
          ),
        },
      ],
      [
        'bio is too long',
        {
          lastName: generateRandomString(USER_CONSTRAINTS.MAX_BIO_LENGTH + 1),
        },
      ],
    ])('should throw validation error when %s', async (_, profileData) => {
      await login(user.email, user.password);
      await expect(
        updateUser({
          ...profileData,
        })
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.VALIDATION.VALIDATION_ERROR)
      );
    });

    test.each([
      ['contains number', 'John123'],
      ['contains at sign', 'Jane@'],
      ['contains special symbol', 'Jane!'],
      ['contains underscore', 'Mary_Jane'],
      ['contains emoji', 'Anna😊'],
      ['contains non-Latin script', 'Иван'],
      ['contains Chinese characters', '张伟'],
    ])('should validate name regex %s correctly', async (_, name) => {
      await login(user.email, user.password);
      await expect(
        updateUser({
          firstName: name,
        })
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.VALIDATION.VALIDATION_ERROR)
      );

      await expect(
        updateUser({
          lastName: name,
        })
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.VALIDATION.VALIDATION_ERROR)
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

  describe('PATCH /api/v1/users/password', () => {
    let userToChange: User;

    beforeAll(async () => {
      [userToChange] = await seedUsers(
        [
          {
            id: 10,
            isBanned: false,
            email: 'newUser123@email.com',
            username: 'newUser123',
            password: passwordGenerator(10),
            role: 'USER',
          },
        ],
        {
          clearExisting: false,
          useDefaults: false,
        }
      );
    });

    afterAll(async () => {
      await prisma.user.delete({
        where: {
          id: userToChange.id,
        },
      });
    });

    it(`should change logged-in user password if oldPassword
       field matches his current one and newPassword field is valid`, async () => {
      const NEW_PASSWORD = passwordGenerator(
        USER_CONSTRAINTS.MAX_PASSWORD_LENGTH - 1
      );
      await login(userToChange.email, userToChange.password);

      const res = await changePassword({
        oldPassword: userToChange.password,
        newPassword: NEW_PASSWORD,
      });
      const { data } = res.data as BaseResponse;

      const userData = (data as any).user as UserDetail;
      expect(userData.password).not.toBeDefined();

      const user = await prisma.user.findFirst({
        where: {
          id: userToChange.id,
        },
      });
      if (!user) throw new Error('Something went wrong');

      const isValidPassword = await validPassword(NEW_PASSWORD, user?.password);
      expect(isValidPassword).toBe(true);
    });

    it(`should throw when oldPassword field doesn't match 
      the current logged-in user password`, async () => {
      await login(admin.email, admin.password);
      await expect(
        changePassword({
          oldPassword: passwordGenerator(10),
          newPassword: passwordGenerator(10),
        })
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.AUTH.INVALID_CREDENTIALS)
      );
    });

    it('should return error when new password matches the old one', async () => {
      await login(admin.email, admin.password);
      await expect(
        changePassword({
          oldPassword: admin.password,
          newPassword: admin.password,
        })
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.VALIDATION.VALIDATION_ERROR)
      );
    });

    test.each([
      [
        'is too short',
        passwordGenerator(USER_CONSTRAINTS.MIN_PASSWORD_LENGTH - 1),
      ],
      [
        'is too long',
        passwordGenerator(USER_CONSTRAINTS.MAX_PASSWORD_LENGTH + 1),
      ],
      [
        'has no symbols',
        passwordGenerator(USER_CONSTRAINTS.MIN_PASSWORD_LENGTH + 1, {
          includeSymbols: false,
        }),
      ],
      [
        'has no numbers',
        passwordGenerator(USER_CONSTRAINTS.MIN_PASSWORD_LENGTH + 1, {
          includeNumbers: false,
        }),
      ],
      [
        'has no uppercase characters',
        passwordGenerator(USER_CONSTRAINTS.MIN_PASSWORD_LENGTH + 1, {
          includeUppercase: false,
        }),
      ],
      [
        'has no lowercase characters',
        passwordGenerator(USER_CONSTRAINTS.MIN_PASSWORD_LENGTH + 1, {
          includeLowercase: false,
        }),
      ],
    ])(
      'should return validation error when either password %s',
      async (_, password) => {
        await login(admin.email, admin.password);
        await expect(
          changePassword({
            oldPassword: passwordGenerator(
              USER_CONSTRAINTS.MAX_PASSWORD_LENGTH - 1
            ),
            newPassword: password,
          })
        ).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.VALIDATION.VALIDATION_ERROR)
        );

        await expect(
          changePassword({
            oldPassword: password,
            newPassword: passwordGenerator(
              USER_CONSTRAINTS.MAX_PASSWORD_LENGTH - 1
            ),
          })
        ).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.VALIDATION.VALIDATION_ERROR)
        );
      }
    );

    it('should return 401 UNAUTHORIZED when not logged in', async () => {
      return await expect(
        changePassword({
          oldPassword: 'Jon',
          newPassword: 'Jon',
        })
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.AUTH.UNAUTHORIZED)
      );
    });
  });

  describe('PATCH /api/v1/users/:id/role', () => {
    let anotherAdmin: User;

    beforeAll(async () => {
      [anotherAdmin] = await seedUsers(
        [
          {
            id: 9,
            email: 'anotherAdmin@email.com',
            username: 'Admin2',
            password: passwordGenerator(10),
            isBanned: false,
            role: 'ADMIN',
          },
        ],
        { clearExisting: false, useDefaults: false }
      );
    });

    afterAll(async () => {
      users = await seedUsers();
      admin = users.find((u) => u.role === 'ADMIN') as User;
      author = users.find((u) => u.role === 'AUTHOR') as User;
      user = users.find((u) => u.role === 'USER') as User;
      mod = users.find((u) => u.role === 'MOD') as User;
    });

    it('should promote or demote user if valid role and userId is provided', async () => {
      await login(admin.email, admin.password);

      const newRole = 'MOD';
      const oldRole = 'USER';

      const res_promote = await changeUserRole(user.id.toString(), {
        role: newRole,
      });
      const { data: promotionData } = res_promote.data as BaseResponse;

      expect(promotionData).toHaveProperty(
        'message',
        SUCCESS_MESSAGES.USERS.roleChange
      );
      const promotedUser = (promotionData as any).user as UserDetail;

      expect(promotedUser.role).toBe(newRole);
      expect(promotedUser.password).not.toBeDefined();

      const res_demote = await changeUserRole(user.id.toString(), {
        role: oldRole,
      });
      const { data: demotionData } = res_demote.data as BaseResponse;
      const demotedUser = (demotionData as any).user as UserDetail;

      expect(demotedUser.role).toBe(oldRole);
    });

    it(`should return an error when the targeted user is an ADMIN`, async () => {
      await login(admin.email, admin.password);
      return await expect(
        changeUserRole(anotherAdmin.id.toString(), {
          role: 'USER',
        })
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SECURITY.ADMIN_PRIVILEGE_VIOLATION)
      );
    });

    it(`should return an error when changing to the same role`, async () => {
      await login(admin.email, admin.password);
      return await expect(
        changeUserRole(user.id.toString(), {
          role: 'USER',
        })
      ).rejects.toMatchObject(
        createErrorCodeResponse(
          ERROR_CODES.VALIDATION.VALIDATION_ERROR,
          VALIDATION_MESSAGES.users.sameRole
        )
      );
    });

    test.each(['USER', 'AUTHOR', 'MOD'])(
      'should return 403 FORBIDDEN when user who is trying to change role is %s',
      async (role) => {
        const user = users.find((u) => u.role === role);
        if (!user) throw new Error('Missing test user');

        await login(user.email, user.password);
        await expect(
          changeUserRole(admin.id.toString(), {
            role: 'USER',
          })
        ).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.SERVER.FORBIDDEN)
        );
      }
    );

    it('should return an error when new user role is ADMIN', async () => {
      await login(admin.email, admin.password);
      return await expect(
        changeUserRole(user.id.toString(), {
          role: 'ADMIN',
        })
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SECURITY.FORBIDDEN_PROMOTION)
      );
    });

    test.each(['admin', 'MODERATOR', 'owner'])(
      'should return validation error when role is not valid',
      async (role) => {
        await login(admin.email, admin.password);
        return await expect(
          changeUserRole(user.id.toString(), {
            role: role as any,
          })
        ).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.VALIDATION.VALIDATION_ERROR)
        );
      }
    );

    testInvalidIds(async (id) => {
      await login(admin.email, admin.password);
      return changeUserRole(id, { role: 'USER' });
    }, 'user id');

    it('should return 404 NOT FOUND for unknown user id', async () => {
      await login(admin.email, admin.password);
      return await expect(
        changeUserRole('999', { role: 'USER' })
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.NOT_FOUND)
      );
    });

    it('should return 401 UNAUTHORIZED when not logged in', async () => {
      return await expect(
        changeUserRole(user.id.toString(), {
          role: 'USER',
        })
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.AUTH.UNAUTHORIZED)
      );
    });
  });

  describe('DELETE /api/v1/users/:id', () => {
    let anotherUser: User;
    let anotherAdmin: User;

    beforeAll(async () => {
      [anotherUser, anotherAdmin] = await seedUsers(
        [
          {
            id: 8,
            email: 'anotherUser@email.com',
            username: 'User2',
            password: passwordGenerator(10),
            isBanned: false,
            role: 'USER',
          },
          {
            id: 9,
            email: 'anotherAdmin@email.com',
            username: 'Admin2',
            password: passwordGenerator(10),
            isBanned: false,
            role: 'ADMIN',
          },
        ],
        { clearExisting: false, useDefaults: false }
      );
    });

    afterAll(async () => {
      users = await seedUsers();
      admin = users.find((u) => u.role === 'ADMIN') as User;
      author = users.find((u) => u.role === 'AUTHOR') as User;
      user = users.find((u) => u.role === 'USER') as User;
      mod = users.find((u) => u.role === 'MOD') as User;
    });

    it(`should delete account if logged-in user matches the one to delete`, async () => {
      await login(user.email, user.password);
      const res = await deleteUser(user.id.toString());
      const { data } = res.data as BaseResponse;

      expect(data).toHaveProperty('message', SUCCESS_MESSAGES.USERS.delete);

      return await expect(getUser(user.id.toString())).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.NOT_FOUND)
      );
    });

    it(`should delete another user's account if done by ADMIN and the target
      account is not ADMIN`, async () => {
      await login(admin.email, admin.password);
      const res = await deleteUser(mod.id.toString());
      const { data } = res.data as BaseResponse;

      expect(data).toHaveProperty('message', SUCCESS_MESSAGES.USERS.delete);

      return await expect(getUser(mod.id.toString())).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.NOT_FOUND)
      );
    });

    it(`should return error when trying to delete yourself as admin`, async () => {
      await login(admin.email, admin.password);

      return await expect(
        deleteUser(admin.id.toString())
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SECURITY.ADMIN_PRIVILEGE_VIOLATION)
      );
    });

    it(`should return 403 FORBIDDEN when trying to delete another user as USER`, async () => {
      await login(anotherUser.email, anotherUser.password);

      return await expect(
        deleteUser(author.id.toString())
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.FORBIDDEN)
      );
    });

    it(`should return 403 FORBIDDEN when trying to delete another admin as ADMIN`, async () => {
      await login(admin.email, admin.password);

      return await expect(
        deleteUser(anotherAdmin.id.toString())
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SECURITY.ADMIN_PRIVILEGE_VIOLATION)
      );
    });

    testInvalidIds(async (id) => {
      await login(admin.email, admin.password);
      return deleteUser(id);
    }, 'user id');

    it('should return 404 NOT FOUND for unknown user id', async () => {
      await login(admin.email, admin.password);
      return await expect(deleteUser('999')).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.NOT_FOUND)
      );
    });

    it('should return 401 UNAUTHORIZED when not logged in', async () => {
      return await expect(deleteUser(user.id.toString())).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.AUTH.UNAUTHORIZED)
      );
    });
  });
});
