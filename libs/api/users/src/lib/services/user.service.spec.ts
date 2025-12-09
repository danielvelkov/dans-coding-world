/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';
import { IUserService } from '../interfaces/user-service.interface.js';
import { IUserRepository } from '@dans-coding-world/shared-data-access-interfaces';
import { User, client, Role, Profile } from '@dans-coding-world/prisma-schema';
import { ReflectiveInjector } from 'injection-js';
import {
  PrismaUserDataAccess as MockUserRepository,
  UserDetail,
} from '@dans-coding-world/user-data-access';
import {
  ERROR_CODES,
  ERROR_MESSAGES,
  USER_CONSTRAINTS,
  VALIDATION_MESSAGES,
} from '@dans-coding-world/shared-constants';
import { UserService, USER_REPOSITORY_TOKEN } from './user.service.js';
import { generateRandomString } from '@dans-coding-world/helpers';
import { passwordGenerator } from '@dans-coding-world/api-auth';

let mockUsersRepo: IUserRepository;
let injector: ReflectiveInjector;
let userService: IUserService;

describe('UserService', () => {
  let user: User;
  let author: User;
  let admin: User;
  let mod: User;

  let userProfile: Profile;

  beforeEach(async () => {
    await client.user.deleteMany();

    mockUsersRepo = new MockUserRepository();

    const roles: Role[] = ['USER', 'ADMIN', 'MOD', 'AUTHOR'];

    [user, admin, mod, author] = await Promise.all(
      roles.map((role) =>
        mockUsersRepo.create({
          email: `fake${role.toLowerCase()}123@gmail.com`,
          password: passwordGenerator(USER_CONSTRAINTS.MAX_PASSWORD_LENGTH - 1),
          username: `fake${role.toLowerCase()}123`,
          role,
          isBanned: false,
        })
      )
    );

    userProfile = await client.profile.create({
      data: {
        userId: user.id,
        avatarURL: 'URL',
        bio: '',
        firstName: 'Bang',
        lastName: 'Dong',
      },
    });

    injector = ReflectiveInjector.resolveAndCreate([
      UserService,
      {
        provide: USER_REPOSITORY_TOKEN,
        useValue: mockUsersRepo,
      },
    ]);
    userService = injector.get(UserService) as UserService;

    jest.spyOn(mockUsersRepo, 'create');
    jest.spyOn(mockUsersRepo, 'delete');
    jest.spyOn(mockUsersRepo, 'update');
  });

  describe('getById()', () => {
    it(`should return user data with profile details, excluding password always
      and removing protected fields like email if no viewerId is provided`, async () => {
      const res = await userService.getById({
        userId: userProfile.userId,
      });

      const receivedUser = res.user as UserDetail;

      expect(receivedUser.id).toBe(user.id);
      expect(receivedUser.username).toBe(user.username);

      expect(receivedUser).not.toHaveProperty('password');
      expect(receivedUser).not.toHaveProperty('email');

      expect(receivedUser.profile).toEqual(userProfile);
    });

    test.each([
      ['is himself', 'USER'],
      ['is admin', 'ADMIN'],
      ['is mod', 'MOD'],
    ])(
      `should return user with protected fields like email, if the viewer %s`,
      async (_, role) => {
        const testUser = [admin, mod, user].find((u) => u.role === role);
        if (!testUser) throw new Error('Missing test user');

        const res = await userService.getById({
          userId: user.id,
          viewerId: testUser.id,
        });

        const receivedUser = res.user as UserDetail;

        expect(receivedUser.email).toBe(user.email);
      }
    );

    test.each([
      ['is null', null],
      ['is undefined', undefined],
      ['is empty string', ''],
    ])('should throw validation error when user id %s', async (_, id) => {
      expect.assertions(1);
      return userService
        .getById({
          userId: id as any,
        })
        .catch((error) => {
          expect(error.message).toMatch(/failed.*validation/i);
        });
    });

    it('should throw when user with that id does not exist', async () => {
      expect.assertions(1);
      return userService
        .getById({
          userId: 9999,
        })
        .catch((error) => {
          expect(error.message).toMatch(
            ERROR_MESSAGES[ERROR_CODES.SERVER.NOT_FOUND]
          );
        });
    });
  });

  describe('update()', () => {
    it('should update specific profile field if valid data provided', async () => {
      const NEW_BIO = 'Im tired';
      const res = await userService.update({
        userId: user.id,
        bio: NEW_BIO,
      });

      const receivedUser = res.user as UserDetail;
      if (!receivedUser.profile) throw new Error('Missing profile');

      expect(mockUsersRepo.update).toHaveBeenCalledTimes(1);

      expect(receivedUser.profile.id).toBe(userProfile.id);
      expect(receivedUser.profile.firstName).toBe(userProfile.firstName);
      expect(receivedUser.profile.lastName).toBe(userProfile.lastName);
      expect(receivedUser.profile.bio).toBe(NEW_BIO);
    });

    it(`should create profile, if user does not have one to update`, async () => {
      const profileData = {
        firstName: 'Yessss',
        lastName: 'Kinggggg',
        bio: 'Bro im new to this. IM NEW',
      };

      const res = await userService.update({
        userId: author.id,
        ...profileData,
      });

      const updatedAuthor = res.user as UserDetail;
      if (!updatedAuthor.profile) throw new Error('Missing profile');

      expect(updatedAuthor.profile.firstName).toEqual(profileData.firstName);
      expect(updatedAuthor.profile.lastName).toEqual(profileData.lastName);
      expect(updatedAuthor.profile.bio).toEqual(profileData.bio);
    });

    it(`should create profile with all fields empty, if user does not have one to update
      and the dto fields are all empty`, async () => {
      const profileData = {};

      const res = await userService.update({
        userId: author.id,
        ...profileData,
      });

      const updatedAuthor = res.user as UserDetail;
      if (!updatedAuthor.profile) throw new Error('Missing profile');

      expect(updatedAuthor.profile.firstName).toBe('');
      expect(updatedAuthor.profile.lastName).toBe('');
      expect(updatedAuthor.profile.bio).toBe('');
    });

    test.each([
      ['is null', null],
      ['is undefined', undefined],
      ['is empty string', ''],
    ])('should throw validation error when user id %s', async (_, id) => {
      expect.assertions(1);
      return userService
        .update({
          userId: id as any,
        })
        .catch((error) => {
          expect(error.message).toMatch(/failed.*validation/i);
        });
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
      expect.assertions(1);
      return userService
        .update({
          userId: userProfile.id,
          ...profileData,
        })
        .catch((error) => {
          expect(error.message).toMatch(/failed.*validation/i);
        });
    });

    test.each([
      ['contains number', 'John123'],
      ['contains at sign', 'Jane@'],
      ['contains special symbol', 'Jane!'],
      ['contains underscore', 'Mary_Jane'],
      ['contains emoji', 'Anna😊'],
      ['contains non-Latin script', 'Иван'],
      ['contains Chinese characters', '张伟'],
    ])('should validate name regex %s correctly', (_, name) => {
      expect.assertions(2);
      userService
        .update({
          userId: userProfile.id,
          firstName: name,
        })
        .catch((error) => {
          expect(error.message).toMatch(/failed.*validation/i);
        });

      userService
        .update({
          userId: userProfile.id,
          lastName: name,
        })
        .catch((error) => {
          expect(error.message).toMatch(/failed.*validation/i);
        });
    });

    it('should throw when user with that id does not exist', async () => {
      expect.assertions(1);
      return userService
        .update({
          userId: 9999,
        })
        .catch((error) => {
          expect(error.message).toMatch(
            ERROR_MESSAGES[ERROR_CODES.SERVER.NOT_FOUND]
          );
        });
    });
  });

  describe('changePassword()', () => {
    it(`should update password if new one is
       valid and old password matches current one`, async () => {
      const NEW_PASS = passwordGenerator(
        USER_CONSTRAINTS.MAX_PASSWORD_LENGTH - 1
      );
      await userService.changePassword({
        userId: user.id,
        oldPassword: user.password,
        newPassword: NEW_PASS,
      });
      expect(mockUsersRepo.update).toHaveBeenCalledTimes(1);

      const updatedUser = await mockUsersRepo.getById(user.id.toString());
      expect(updatedUser?.password).toBe(NEW_PASS);
    });

    it(`should throw when old password doesn't match the current one`, async () => {
      expect.assertions(1);
      return userService
        .changePassword({
          userId: user.id,
          oldPassword: passwordGenerator(10),
          newPassword: user.password,
        })
        .catch((error) => {
          expect(error.message).toBe(
            ERROR_MESSAGES[ERROR_CODES.AUTH.INVALID_CREDENTIALS]
          );
        });
    });

    it('should throw error when old password matches the new one', async () => {
      expect.assertions(1);
      return userService
        .changePassword({
          userId: user.id,
          oldPassword: user.password,
          newPassword: user.password,
        })
        .catch((error) => {
          expect(error.message).toBe(
            ERROR_MESSAGES[ERROR_CODES.AUTH.SAME_PASSWORD]
          );
        });
    });

    test.each([
      ['is null', null],
      ['is undefined', undefined],
      ['is empty string', ''],
    ])('should throw validation error when user id %s', async (_, id) => {
      expect.assertions(1);
      return userService
        .changePassword({
          userId: id as any,
          oldPassword: passwordGenerator(
            USER_CONSTRAINTS.MAX_PASSWORD_LENGTH - 1
          ),
          newPassword: passwordGenerator(
            USER_CONSTRAINTS.MAX_PASSWORD_LENGTH - 1
          ),
        })
        .catch((error) => {
          expect(error.message).toMatch(/failed.*validation/i);
        });
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
    ])('should throw when either password %s', async (_, password) => {
      expect.assertions(3);
      expect(mockUsersRepo.update).not.toHaveBeenCalled();
      userService
        .changePassword({
          userId: user.id,
          oldPassword: passwordGenerator(
            USER_CONSTRAINTS.MAX_PASSWORD_LENGTH - 1
          ),
          newPassword: password,
        })
        .catch((err) => {
          expect(err.message).toMatch(/failed.*validation/);
        });

      userService
        .changePassword({
          userId: user.id,
          oldPassword: password,
          newPassword: passwordGenerator(
            USER_CONSTRAINTS.MAX_PASSWORD_LENGTH - 1
          ),
        })
        .catch((err) => {
          expect(err.message).toMatch(/failed.*validation/);
        });
    });

    it('should throw when user with that id does not exist', async () => {
      expect.assertions(1);
      return userService
        .changePassword({
          userId: 9999,
          oldPassword: passwordGenerator(
            USER_CONSTRAINTS.MAX_PASSWORD_LENGTH - 1
          ),
          newPassword: passwordGenerator(
            USER_CONSTRAINTS.MAX_PASSWORD_LENGTH - 1
          ),
        })
        .catch((error) => {
          expect(error.message).toMatch(
            ERROR_MESSAGES[ERROR_CODES.SERVER.NOT_FOUND]
          );
        });
    });
  });

  describe('changeRole()', () => {
    it('should promote or demote user if valid role and userId is provided', async () => {
      // promote to mod
      let updatedUser = await userService.changeRole({
        userId: user.id,
        role: 'MOD',
      });
      expect(updatedUser?.role).toBe('MOD');

      // demote back to USER
      updatedUser = await userService.changeRole({
        userId: user.id,
        role: 'USER',
      });
      expect(updatedUser?.role).toBe('USER');

      expect(mockUsersRepo.update).toHaveBeenCalledTimes(2);
    });

    it(`should throw when trying to change admin's role`, async () => {
      expect.assertions(1);
      return userService
        .changeRole({
          userId: admin.id,
          role: 'USER',
        })
        .catch((error) => {
          expect(error.message).toMatch(
            ERROR_MESSAGES[ERROR_CODES.SECURITY.ADMIN_PRIVILEGE_VIOLATION]
          );
        });
    });

    it('should throw when changing the user to the same role', async () => {
      expect.assertions(1);
      return userService
        .changeRole({
          userId: user.id,
          role: user.role,
        })
        .catch((error) => {
          expect(error.message).toMatch(VALIDATION_MESSAGES.users.sameRole);
        });
    });

    it('should throw when new user role is ADMIN', async () => {
      expect.assertions(1);
      return userService
        .changeRole({
          userId: user.id,
          role: 'ADMIN',
        })
        .catch((error) => {
          expect(error.message).toMatch(
            ERROR_MESSAGES[ERROR_CODES.SECURITY.SELF_ACTION_FORBIDDEN]
          );
        });
    });

    test.each(['admin', 'MODERATOR', 'owner'])(
      'should throw when role is not from the specified user role enum',
      async (role) => {
        expect.assertions(1);
        return userService
          .changeRole({
            userId: user.id,
            role: role as any,
          })
          .catch((error) => {
            expect(error.message).toMatch(/failed.*validation/i);
          });
      }
    );

    test.each([
      ['is null', null],
      ['is undefined', undefined],
      ['is empty string', ''],
    ])('should throw validation error when user id %s', async (_, id) => {
      expect.assertions(1);
      return userService
        .changeRole({
          userId: id as any,
          role: 'AUTHOR',
        })
        .catch((error) => {
          expect(error.message).toMatch(/failed.*validation/i);
        });
    });

    it('should throw when user with that id does not exist', async () => {
      expect.assertions(1);
      return userService
        .changeRole({
          userId: 9999,
          role: 'AUTHOR',
        })
        .catch((error) => {
          expect(error.message).toMatch(
            ERROR_MESSAGES[ERROR_CODES.SERVER.NOT_FOUND]
          );
        });
    });
  });

  describe('changeBanStatus()', () => {
    test.each(['MOD', 'ADMIN'] as Role[])(
      'should ban/un-ban user if its done by %s',
      async (role) => {
        const userWithElevatedPrivileges = [mod, admin].find(
          (u) => u.role === role
        );
        if (!userWithElevatedPrivileges) throw new Error('Missing test user');

        for (const bannedStatus of [true, false]) {
          const bannedUser = await userService.changeBanStatus({
            userId: userWithElevatedPrivileges.id,
            userToChangeId: user.id,
            isBanned: bannedStatus,
          });
          expect(bannedUser.isBanned).toBe(bannedStatus);
        }
      }
    );

    it('should be able ban/un-ban MOD if done by ADMIN', async () => {
      for (const bannedStatus of [true, false]) {
        const bannedUser = await userService.changeBanStatus({
          userId: admin.id,
          userToChangeId: mod.id,
          isBanned: bannedStatus,
        });
        expect(bannedUser.isBanned).toBe(bannedStatus);
      }
    });

    it(`should throw when trying to ban another MOD as moderator`, async () => {
      const anotherMod = await mockUsersRepo.create({
        email: 'anotherMod@email.com',
        username: 'mod2',
        password: passwordGenerator(10),
        isBanned: false,
        role: 'MOD',
      });

      expect.assertions(1);
      return userService
        .changeBanStatus({
          userId: mod.id,
          userToChangeId: anotherMod.id,
          isBanned: true,
        })
        .catch((error) => {
          expect(error.message).toMatch(
            ERROR_MESSAGES[ERROR_CODES.SECURITY.ADMIN_PRIVILEGE_VIOLATION]
          );
        });
    });

    it('should throw when the user is trying to ban/un-ban himself', async () => {
      expect.assertions(2);
      for (const bannedStatus of [true, false])
        userService
          .changeBanStatus({
            userId: mod.id,
            userToChangeId: mod.id,
            isBanned: bannedStatus,
          })
          .catch((error) => {
            expect(error.message).toMatch(
              ERROR_MESSAGES[ERROR_CODES.SECURITY.SELF_ACTION_FORBIDDEN]
            );
          });
    });

    test.each([
      ['is null', null],
      ['is undefined', undefined],
      ['is empty string', ''],
    ])(
      'should throw validation error when userToChangeId %s',
      async (_, id) => {
        expect.assertions(1);
        return userService
          .changeBanStatus({
            userId: mod.id,
            userToChangeId: id as any,
            isBanned: true,
          })
          .catch((error) => {
            expect(error.message).toMatch(/failed.*validation/i);
          });
      }
    );

    test.each([
      ['is null', null],
      ['is undefined', undefined],
      ['is empty string', ''],
    ])('should throw validation error when userId %s', async (_, id) => {
      expect.assertions(1);
      return userService
        .changeBanStatus({
          userId: id as any,
          userToChangeId: user.id,
          isBanned: true,
        })
        .catch((error) => {
          expect(error.message).toMatch(/failed.*validation/i);
        });
    });

    it('should throw when any of the specified user Ids do not exist', async () => {
      expect.assertions(2);
      for (const isMod of [true, false])
        userService
          .changeBanStatus({
            userId: isMod ? mod.id : 9999,
            userToChangeId: isMod ? 9999 : user.id,
            isBanned: true,
          })
          .catch((error) => {
            expect(error.message).toMatch(
              ERROR_MESSAGES[ERROR_CODES.SERVER.NOT_FOUND]
            );
          });
    });
  });

  describe('delete()', () => {
    it('should allow userId with role USER to delete his own account', async () => {
      await userService.delete({
        userId: user.id,
        userToDeleteId: user.id,
      });
      expect(mockUsersRepo.delete).toHaveBeenCalledTimes(1);
    });

    test.each(['USER', 'MOD', 'AUTHOR'])(
      'should be able to delete a %s if done by ADMIN',
      async (role) => {
        const userToDelete = [mod, author, user].find((u) => u.role === role);
        if (!userToDelete) throw new Error('Missing test user');

        await userService.delete({
          userId: admin.id,
          userToDeleteId: userToDelete.id,
        });
        expect(mockUsersRepo.delete).toHaveBeenCalledTimes(1);
      }
    );

    it(`should throw when trying to delete another user as USER`, async () => {
      const anotherUser = await mockUsersRepo.create({
        email: 'anotherUser@email.com',
        username: 'User2',
        password: passwordGenerator(10),
        isBanned: false,
        role: 'USER',
      });

      expect.assertions(1);
      return userService
        .delete({
          userId: user.id,
          userToDeleteId: anotherUser.id,
        })
        .catch((error) => {
          expect(error.message).toMatch(
            ERROR_MESSAGES[ERROR_CODES.SERVER.FORBIDDEN]
          );
        });
    });

    it('should throw when the admin is trying to delete another admin (including himself)', async () => {
      const anotherAdmin = await mockUsersRepo.create({
        email: 'anotherAdmin@email.com',
        username: 'Admin2',
        password: passwordGenerator(10),
        isBanned: false,
        role: 'ADMIN',
      });

      expect.assertions(2);
      for (const user of [admin, anotherAdmin])
        userService
          .delete({
            userId: admin.id,
            userToDeleteId: user.id,
          })
          .catch((error) => {
            expect(error.message).toMatch(
              ERROR_MESSAGES[ERROR_CODES.SECURITY.ADMIN_PRIVILEGE_VIOLATION]
            );
          });
    });

    test.each([
      ['is null', null],
      ['is undefined', undefined],
      ['is empty string', ''],
    ])(
      'should throw validation error when userToDeleteId %s',
      async (_, id) => {
        expect.assertions(1);
        return userService
          .delete({
            userId: mod.id,
            userToDeleteId: id as any,
          })
          .catch((error) => {
            expect(error.message).toMatch(/failed.*validation/i);
          });
      }
    );

    test.each([
      ['is null', null],
      ['is undefined', undefined],
      ['is empty string', ''],
    ])('should throw validation error when userId %s', async (_, id) => {
      expect.assertions(1);
      return userService
        .delete({
          userId: id as any,
          userToDeleteId: user.id,
        })
        .catch((error) => {
          expect(error.message).toMatch(/failed.*validation/i);
        });
    });

    it('should throw when any of the specified user Ids do not exist', async () => {
      expect.assertions(2);
      for (const isAdmin of [true, false])
        userService
          .delete({
            userId: isAdmin ? admin.id : 9999,
            userToDeleteId: isAdmin ? 9999 : user.id,
          })
          .catch((error) => {
            expect(error.message).toMatch(
              ERROR_MESSAGES[ERROR_CODES.SERVER.NOT_FOUND]
            );
          });
    });
  });
});
