import {
  Profile,
  RefreshToken,
  Role,
  User,
  client as prisma,
} from '@dans-coding-world/prisma-schema';
import {
  seedRefreshTokens,
  seedUsers,
  getTokenById,
} from '@dans-coding-world/api-tools';
import { createUsersRouteHelper } from '../helper/users-request.helper';
import {
  ERROR_CODES,
  SUCCESS_MESSAGES,
  USER_CONSTRAINTS,
  VALIDATION_MESSAGES,
} from '@dans-coding-world/shared-constants';
import { setupClient } from '../helper/test-client.helper';
import { testInvalidIds } from '../helper/test-cases.helper';
import { createErrorCodeResponse } from '../helper/error-response.helper';
import { UserDetail } from '@dans-coding-world/user-data-access';
import {
  generateRandomString,
  passwordGenerator,
  validPassword,
} from '@dans-coding-world/helpers';
import { getData, getMessage } from '../helper/common.helper';
import { MOCK_RESULT } from '@dans-coding-world/api-file-storage';
import path from 'path';

describe('/api/v1/users', () => {
  // 1. Define separate helpers per role to avoid re-logging in
  type UserHelpers = ReturnType<typeof createUsersRouteHelper>;

  let adminHelpers: UserHelpers;
  let userHelpers: UserHelpers;
  let authorHelpers: UserHelpers;
  let modHelpers: UserHelpers;
  let anonHelpers: UserHelpers; // For unauthenticated requests

  let users: User[] = [];
  let refreshTokens: RefreshToken[] = [];

  let admin: User;
  let mod: User;
  let author: User;
  let user: User;

  // Extra users for specific destructive tests
  let userToDelete: User;
  let userToChangePassword: User;
  let anotherAdmin: User;
  let anotherMod: User;
  let anotherUser: User;

  let userProfile: Profile;

  const TEST_IDS = {
    userToBeDeletedId: 67,
    userForPasswordChangeId: 42,
    anotherAdminId: 1337,
    anotherModId: 1448,
    anotherUserId: 55,
  };

  beforeAll(async () => {
    users = await seedUsers([
      // Add specific users for destructive tests to avoid re-seeding
      {
        role: 'USER',
        username: 'toBeDeleted',
        email: 'del@test.com',
        id: TEST_IDS.userToBeDeletedId,
        isBanned: false,
        password: passwordGenerator(10),
      },
      {
        role: 'USER',
        username: 'passChange',
        email: 'pass@test.com',
        id: TEST_IDS.userForPasswordChangeId,
        isBanned: false,
        password: passwordGenerator(10),
      },
      {
        role: 'ADMIN',
        username: 'adminHacker2',
        email: 'admin@test.com',
        id: TEST_IDS.anotherAdminId,
        isBanned: false,
        password: passwordGenerator(10),
      },
      {
        role: 'MOD',
        username: 'modBoy132',
        email: 'mod@test.com',
        id: TEST_IDS.anotherModId,
        isBanned: false,
        password: passwordGenerator(10),
      },
      {
        role: 'USER',
        username: 'User2',
        email: 'anotherUser@email.com',
        id: TEST_IDS.anotherUserId,
        isBanned: false,
        password: passwordGenerator(10),
      },
    ]);

    admin = users.find((u) => u.role === 'ADMIN') as User;
    author = users.find((u) => u.role === 'AUTHOR') as User;
    user = users.find(
      (u) =>
        u.role === 'USER' &&
        u.id !== TEST_IDS.userForPasswordChangeId &&
        u.id !== TEST_IDS.userToBeDeletedId
    ) as User;
    mod = users.find((u) => u.role === 'MOD') as User;
    userToDelete = users.find(
      (u) => u.id === TEST_IDS.userToBeDeletedId
    ) as User;
    userToChangePassword = users.find(
      (u) => u.id === TEST_IDS.userForPasswordChangeId
    ) as User;
    anotherAdmin = users.find((u) => u.id === TEST_IDS.anotherAdminId) as User;
    anotherMod = users.find((u) => u.id === TEST_IDS.anotherModId) as User;
    anotherUser = users.find((u) => u.id === TEST_IDS.anotherUserId) as User;

    // Profile Setup
    userProfile = await prisma.profile.create({
      data: {
        userId: user.id,
        firstName: 'John',
        lastName: 'Doe',
        bio: 'Do not look for me',
        avatarURL: 'some.image.site/1',
      },
    });

    [adminHelpers, userHelpers, authorHelpers, modHelpers, anonHelpers] =
      await Promise.all([
        setupClient(createUsersRouteHelper, admin),
        setupClient(createUsersRouteHelper, user),
        setupClient(createUsersRouteHelper, author),
        setupClient(createUsersRouteHelper, mod),
        setupClient(createUsersRouteHelper, undefined),
      ]);
  });

  describe('GET /api/v1/users/:id', () => {
    it.concurrent(
      `should return user details without email if viewer is not owner/admin/mod`,
      async () => {
        const res = await authorHelpers.getUser(user.id.toString());

        expect(getMessage(res)).toBe(SUCCESS_MESSAGES.USERS.get);
        const userData = getData<UserDetail>(res, 'user');
        expect(userData.id).toBe(user.id);
        expect(userData.username).toBe(user.username);

        expect(userData.email).not.toBeDefined();
        expect(userData.password).not.toBeDefined();

        expect(userData.profile).toBeDefined();
        expect(userData.profile).toEqual(userProfile);
      }
    );

    test.concurrent.each([
      ['the owner of the account', 'USER'],
      ['an ADMIN', 'ADMIN'],
      ['a MOD', 'MOD'],
    ])('should return email when user is %s', async (_, role) => {
      const helper =
        role === 'ADMIN'
          ? adminHelpers
          : role === 'MOD'
          ? modHelpers
          : userHelpers;

      const res = await helper.getUser(user.id.toString());
      const userData = getData<User>(res, 'user');
      expect(userData.email).toBe(user.email);
    });

    testInvalidIds((id) => adminHelpers.getUser(id), 'user id');

    it.concurrent(
      'should return 404 NOT FOUND for unknown user id',
      async () => {
        return await expect(adminHelpers.getUser('999')).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.SERVER.NOT_FOUND)
        );
      }
    );
  });

  describe('PATCH /api/v1/users', () => {
    it(`should update logged-in user's profile details`, async () => {
      const NEW_PROFILE_DATA = { firstName: 'Bogus', lastName: 'Dingus' };
      // Using userHelpers means we are already logged in as 'user'
      const res = await userHelpers.updateUser(NEW_PROFILE_DATA);

      expect(getMessage(res)).toBe(SUCCESS_MESSAGES.USERS.update);

      const userData = getData<UserDetail>(res, 'user');

      expect(userData.profile?.firstName).toBe(NEW_PROFILE_DATA.firstName);
      expect(userData.profile?.lastName).toBe(NEW_PROFILE_DATA.lastName);

      expect(userData.profile?.bio).toBe(userProfile.bio);
    });

    it(`should create profile details, if user does not have them defined yet`, async () => {
      const NEW_PROFILE_DATA = {
        firstName: 'Bogus',
        lastName: 'Dingus',
      };

      const res_get = await authorHelpers.getUser(author.id.toString());
      const oldProfile = getData<UserDetail>(res_get, 'user').profile;

      expect(oldProfile).toBeNull();

      const res = await authorHelpers.updateUser(NEW_PROFILE_DATA);

      const userData = getData<UserDetail>(res, 'user');
      expect(userData.profile?.firstName).toBe(NEW_PROFILE_DATA.firstName);
      expect(userData.profile?.lastName).toBe(NEW_PROFILE_DATA.lastName);

      // Missing fields in request are set to empty string
      expect(userData.profile?.bio).toBe('');
      expect(userData.profile?.avatarURL).toBe('');
    });

    it(`should set profile avatar_url if valid avatar image is passed`, async () => {
      const rootPath = process.env.NX_WORKSPACE_ROOT;
      if (!rootPath) throw new Error('Missing env variable');

      const pathToTestFile = path.join(
        rootPath,
        'apps/api-e2e/src/data/avatar.png'
      );
      const res = await authorHelpers.updateUser({}, pathToTestFile);

      const userData = getData<UserDetail>(res, 'user');
      // Missing fields in request are set to empty string
      expect(userData.profile?.bio).toBe('');
      expect(userData.profile?.avatarURL).toBe(MOCK_RESULT);
    });

    it(`should remove profile avatar if removeAvatar is true`, async () => {
      const res = await authorHelpers.updateUser({ removeAvatar: true });

      const userData = getData<UserDetail>(res, 'user');
      expect(userData.profile?.avatarURL).toBeFalsy();
    });

    it(`should not set profile avatar_url if valid avatar image is passed but "removeAvatar" is true`, async () => {
      const rootPath = process.env.NX_WORKSPACE_ROOT;
      if (!rootPath) throw new Error('Missing env variable');

      const pathToTestFile = path.join(
        rootPath,
        'apps/api-e2e/src/data/avatar.png'
      );
      const res = await authorHelpers.updateUser(
        { removeAvatar: true },
        pathToTestFile
      );

      const userData = getData<UserDetail>(res, 'user');
      expect(userData.profile?.avatarURL).toBeFalsy();
    });

    it.concurrent(
      'should return 401 UNAUTHORIZED when not logged in',
      async () => {
        return await expect(
          anonHelpers.updateUser({
            firstName: 'Jon',
          })
        ).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.AUTH.UNAUTHORIZED)
        );
      }
    );

    // Use concurrent for validation loops
    test.concurrent.each([
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
      await expect(userHelpers.updateUser(profileData)).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.VALIDATION.VALIDATION_ERROR)
      );
    });

    test.concurrent.each([
      ['contains number', 'John123'],
      ['contains at sign', 'Jane@'],
      ['contains special symbol', 'Jane!'],
      ['contains underscore', 'Mary_Jane'],
      ['contains emoji', 'Anna😊'],
      ['contains non-Latin script', 'Иван'],
      ['contains Chinese characters', '张伟'],
    ])('should validate name regex %s correctly', async (_, name) => {
      await expect(
        userHelpers.updateUser({
          firstName: name,
        })
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.VALIDATION.VALIDATION_ERROR)
      );

      await expect(
        userHelpers.updateUser({
          lastName: name,
        })
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.VALIDATION.VALIDATION_ERROR)
      );
    });

    it(`should return error when logged-in user is banned`, async () => {
      // Explicitly ban just for this test, then revert
      await prisma.user.update({
        where: { id: user.id },
        data: { isBanned: true },
      });

      try {
        await expect(
          userHelpers.updateUser({ firstName: 'Fail' })
        ).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.AUTH.BANNED)
        );
      } finally {
        await prisma.user.update({
          where: { id: user.id },
          data: { isBanned: false },
        });
      }
    });
  });

  describe('POST /api/v1/users/:userId/revoke-tokens', () => {
    beforeAll(async () => {
      // Seed tokens once for this user
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
      const res = await adminHelpers.revokeUserTokens(user.id.toString());
      const revokedCount = getData<number>(res, 'revokedCount');

      expect(getMessage(res)).toBe(SUCCESS_MESSAGES.AUTH.revoke);

      const userTokens = refreshTokens.filter((rt) => rt.userId === user.id);
      expect(revokedCount).toBe(userTokens.length);

      for (const token of userTokens)
        expect((await getTokenById(token.jti)).revoked).toBe(true);
    });

    it.concurrent(
      'should return no revoked tokens when user does not exist',
      async () => {
        const res = await adminHelpers.revokeUserTokens('9999');
        const revokedCount = getData<number>(res, 'revokedCount');

        expect(revokedCount).toBe(0);
      }
    );

    test.concurrent.each(['USER', 'AUTHOR'])(
      'should return 403 FORBIDDEN when user who is trying to revoke tokens is %s',
      async (role) => {
        const helper = role === 'USER' ? userHelpers : authorHelpers;
        await expect(
          helper.revokeUserTokens(mod.id.toString())
        ).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.SERVER.FORBIDDEN)
        );
      }
    );

    testInvalidIds(async (id) => {
      return adminHelpers.revokeUserTokens(id);
    }, 'user id');

    it.concurrent(
      'should return 401 UNAUTHORIZED when not logged in',
      async () => {
        return await expect(
          anonHelpers.revokeUserTokens(user.id.toString())
        ).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.AUTH.UNAUTHORIZED)
        );
      }
    );

    it.concurrent(
      `should return error when logged-in user is banned and trying to
      access endpoint`,
      async () => {
        await prisma.user.update({
          where: {
            id: mod.id,
          },
          data: {
            isBanned: true,
          },
        });
        try {
          await expect(
            modHelpers.revokeUserTokens(user.id.toString())
          ).rejects.toMatchObject(
            createErrorCodeResponse(ERROR_CODES.AUTH.BANNED)
          );
        } finally {
          await prisma.user.update({
            where: {
              id: mod.id,
            },
            data: {
              isBanned: false,
            },
          });
        }
      }
    );
  });

  describe('PATCH /api/v1/users/password', () => {
    it(`should change logged-in user password`, async () => {
      // We need a specific client for this user since they aren't the main 'user'
      const { changePassword } = await setupClient(
        createUsersRouteHelper,
        userToChangePassword
      );

      const NEW_PASS = passwordGenerator(
        USER_CONSTRAINTS.MAX_PASSWORD_LENGTH - 1
      );

      const res = await changePassword({
        oldPassword: userToChangePassword.password,
        newPassword: NEW_PASS,
      });

      const userData = getData<UserDetail>(res, 'user');
      expect(userData.password).not.toBeDefined();

      const user = await prisma.user.findFirst({
        where: {
          id: userToChangePassword.id,
        },
      });
      if (!user) throw new Error('Something went wrong');

      const isValidPassword = await validPassword(NEW_PASS, user?.password);
      expect(isValidPassword).toBe(true);
    });

    it(`should throw when old password field doesn't match 
      the current logged-in user password`, async () => {
      await expect(
        adminHelpers.changePassword({
          oldPassword: passwordGenerator(10),
          newPassword: passwordGenerator(10),
        })
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.AUTH.INVALID_CREDENTIALS)
      );
    });

    it('should return error when new password matches the old one', async () => {
      await expect(
        adminHelpers.changePassword({
          oldPassword: admin.password,
          newPassword: admin.password,
        })
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.AUTH.SAME_PASSWORD)
      );
    });

    test.concurrent.each([
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
        // new password field
        await expect(
          adminHelpers.changePassword({
            oldPassword: admin.password,
            newPassword: password,
          })
        ).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.VALIDATION.VALIDATION_ERROR)
        );

        // old password field
        await expect(
          adminHelpers.changePassword({
            oldPassword: password,
            newPassword: passwordGenerator(10),
          })
        ).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.VALIDATION.VALIDATION_ERROR)
        );
      }
    );

    it('should return 401 UNAUTHORIZED when not logged in', async () => {
      return await expect(
        anonHelpers.changePassword({
          oldPassword: 'Jon',
          newPassword: 'Doe',
        })
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.AUTH.UNAUTHORIZED)
      );
    });
  });

  describe('PATCH /api/v1/users/:id/role', () => {
    test.each([
      ['promote', 'MOD'],
      ['demote', 'USER'],
    ])(
      'should %s user if valid role and userId is provided',
      async (_, role) => {
        const newRole = role as Role;

        const res = await adminHelpers.changeUserRole(user.id.toString(), {
          role: newRole,
        });

        expect(getMessage(res)).toBe(SUCCESS_MESSAGES.USERS.roleChange);

        const promotedUser = getData<User>(res, 'user');

        expect(promotedUser.role).toBe(newRole);
        expect(promotedUser.password).not.toBeDefined();
      }
    );

    it(`should return an error when the targeted user is an ADMIN`, async () => {
      return await expect(
        adminHelpers.changeUserRole(anotherAdmin.id.toString(), {
          role: 'USER',
        })
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SECURITY.ADMIN_PRIVILEGE_VIOLATION)
      );
    });

    it(`should return an error when changing to the same role`, async () => {
      return await expect(
        adminHelpers.changeUserRole(user.id.toString(), {
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
        const helper =
          role === 'ADMIN'
            ? adminHelpers
            : role === 'MOD'
            ? modHelpers
            : userHelpers;

        await expect(
          helper.changeUserRole(admin.id.toString(), {
            role: 'USER',
          })
        ).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.SERVER.FORBIDDEN)
        );
      }
    );

    it('should return an error when new user role is ADMIN', async () => {
      return await expect(
        adminHelpers.changeUserRole(user.id.toString(), {
          role: 'ADMIN',
        })
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SECURITY.FORBIDDEN_PROMOTION)
      );
    });

    test.concurrent.each(['admin', 'MODERATOR', 'owner'])(
      'should return validation error when role is not valid',
      async (role) => {
        return await expect(
          adminHelpers.changeUserRole(user.id.toString(), {
            role: role as any,
          })
        ).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.VALIDATION.VALIDATION_ERROR)
        );
      }
    );

    testInvalidIds(
      async (id) => adminHelpers.changeUserRole(id, { role: 'USER' }),
      'user id'
    );

    it('should return 404 NOT FOUND for unknown user id', async () => {
      return await expect(
        adminHelpers.changeUserRole('999', { role: 'USER' })
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.NOT_FOUND)
      );
    });

    it('should return 401 UNAUTHORIZED when not logged in', async () => {
      return await expect(
        anonHelpers.changeUserRole(user.id.toString(), {
          role: 'USER',
        })
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.AUTH.UNAUTHORIZED)
      );
    });
  });

  describe('PATCH /api/v1/users/:id/ban', () => {
    test.each(['MOD', 'ADMIN'])(
      'should ban/un-ban USER or AUTHOR if its done by %s',
      async (role) => {
        const helper = role === 'ADMIN' ? adminHelpers : modHelpers;

        for (const userToBan of [user, author])
          for (const bannedStatus of [true, false]) {
            const res_promote = await helper.changeBanStatus(
              userToBan.id.toString(),
              {
                isBanned: bannedStatus,
              }
            );

            expect(getMessage(res_promote)).toBe(
              bannedStatus
                ? SUCCESS_MESSAGES.USERS.banned
                : SUCCESS_MESSAGES.USERS.unbanned
            );
            const updatedUser = getData<User>(res_promote, 'user');
            expect(updatedUser.isBanned).toBe(bannedStatus);
          }
      }
    );

    it(`should return an error when trying to ban/un-ban another MOD as moderator`, async () => {
      for (const bannedStatus of [true, false])
        await expect(
          modHelpers.changeBanStatus(anotherMod.id.toString(), {
            isBanned: bannedStatus,
          })
        ).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.SECURITY.MODERATION_CONFLICT)
        );
    });

    it(`should return an error when trying to ban/un-ban another ADMIN as admin`, async () => {
      for (const bannedStatus of [true, false])
        await expect(
          adminHelpers.changeBanStatus(anotherAdmin.id.toString(), {
            isBanned: bannedStatus,
          })
        ).rejects.toMatchObject(
          createErrorCodeResponse(
            ERROR_CODES.SECURITY.ADMIN_PRIVILEGE_VIOLATION
          )
        );
    });

    it('should return an error when the user is trying to ban/un-ban himself', async () => {
      for (const bannedStatus of [true, false])
        await expect(
          modHelpers.changeBanStatus(mod.id.toString(), {
            isBanned: bannedStatus,
          })
        ).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.SECURITY.SELF_ACTION_FORBIDDEN)
        );
    });

    test.each(['USER', 'AUTHOR'])(
      'should return 403 FORBIDDEN when user who is trying to initiate a ban is an %s',
      async (role) => {
        const user = users.find((u) => u.role === role);
        if (!user) throw new Error('Missing test user');

        await expect(
          userHelpers.changeBanStatus(mod.id.toString(), {
            isBanned: true,
          })
        ).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.SERVER.FORBIDDEN)
        );
      }
    );

    testInvalidIds(async (id) => {
      return adminHelpers.changeBanStatus(id, { isBanned: true });
    }, 'user id');

    it('should return 404 NOT FOUND for unknown user id', async () => {
      return await expect(
        adminHelpers.changeBanStatus('999', { isBanned: true })
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.NOT_FOUND)
      );
    });

    it('should return 401 UNAUTHORIZED when not logged in', async () => {
      return await expect(
        anonHelpers.changeBanStatus(user.id.toString(), {
          isBanned: true,
        })
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.AUTH.UNAUTHORIZED)
      );
    });

    it(`should return error when logged-in user is banned and trying to
      access endpoint`, async () => {
      await prisma.user.update({
        where: {
          id: mod.id,
        },
        data: {
          isBanned: true,
        },
      });
      return await expect(
        modHelpers.changeBanStatus(user.id.toString(), {
          isBanned: true,
        })
      ).rejects.toMatchObject(createErrorCodeResponse(ERROR_CODES.AUTH.BANNED));
    });
  });

  describe('DELETE /api/v1/users/:id', () => {
    it(`should delete account if logged-in user matches the one to delete`, async () => {
      // Create a fresh client just for this disposable user
      const { deleteUser } = await setupClient(
        createUsersRouteHelper,
        userToDelete
      );

      const res = await deleteUser(userToDelete.id.toString());
      expect(getMessage(res)).toBe(SUCCESS_MESSAGES.USERS.delete);

      return await expect(
        adminHelpers.getUser(userToDelete.id.toString())
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.NOT_FOUND)
      );
    });

    it(`should delete another user's account if done by ADMIN and the target
      account is not ADMIN`, async () => {
      await adminHelpers.deleteUser(mod.id.toString());

      return await expect(
        adminHelpers.getUser(mod.id.toString())
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.NOT_FOUND)
      );
    });

    it(`should return error when trying to delete yourself as admin`, async () => {
      return await expect(
        adminHelpers.deleteUser(admin.id.toString())
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SECURITY.ADMIN_PRIVILEGE_VIOLATION)
      );
    });

    it(`should return 403 FORBIDDEN when trying to delete another user as USER`, async () => {
      const { deleteUser } = await setupClient(
        createUsersRouteHelper,
        anotherUser
      );

      return await expect(
        deleteUser(author.id.toString())
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.FORBIDDEN)
      );
    });

    it(`should return 403 FORBIDDEN when trying to delete another admin as ADMIN`, async () => {
      return await expect(
        adminHelpers.deleteUser(anotherAdmin.id.toString())
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SECURITY.ADMIN_PRIVILEGE_VIOLATION)
      );
    });

    testInvalidIds(async (id) => {
      return adminHelpers.deleteUser(id);
    }, 'user id');

    it('should return 404 NOT FOUND for unknown user id', async () => {
      return await expect(
        adminHelpers.deleteUser('9999')
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.SERVER.NOT_FOUND)
      );
    });

    it('should return 401 UNAUTHORIZED when not logged in', async () => {
      return await expect(
        anonHelpers.deleteUser(user.id.toString())
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.AUTH.UNAUTHORIZED)
      );
    });

    it(`should return error when logged-in user is banned and trying to
      access endpoint`, async () => {
      await prisma.user.update({
        where: {
          id: author.id,
        },
        data: {
          isBanned: true,
        },
      });
      return await expect(
        authorHelpers.deleteUser(author.id.toString())
      ).rejects.toMatchObject(createErrorCodeResponse(ERROR_CODES.AUTH.BANNED));
    });
  });
});
