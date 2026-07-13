/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';
import { IUserService } from '../interfaces/user-service.interface.js';
import { IUserRepository } from '@dans-coding-world/shared-data-access-interfaces';
import { client } from '@dans-coding-world/prisma-schema';
import type { User, Role, Profile } from '@dans-coding-world/prisma-schema';
import { ReflectiveInjector } from 'injection-js';
import {
  PrismaUserDataAccess as MockUserRepository,
  UserDetail,
} from '@dans-coding-world/user-data-access';
import {
  ERROR_CODES,
  ERROR_MESSAGES,
  PAGINATION,
  USER_CONSTRAINTS,
  VALIDATION_MESSAGES,
} from '@dans-coding-world/shared-constants';
import { UserService, USER_REPOSITORY_TOKEN } from './user.service.js';
import {
  generateRandomString,
  randomSelect,
  passwordGenerator,
  hashPassword,
  validPassword,
  sortObjectsByStringProp,
} from '@dans-coding-world/helpers';
import {
  IStorageProvider,
  STORAGE_PROVIDER_TOKEN,
} from '@dans-coding-world/api-file-storage';
import { AvatarImageDto } from '@dans-coding-world/shared-user-dto';
import fs from 'fs';

const AVATAR_URL =
  'https://res.cloudinary.com/lfdakj/image/upload/v1765834967/m1hadwxa4bjk1xjitssn.png';

const mockStorageProvider: IStorageProvider = {
  uploadFile: jest.fn().mockResolvedValue(AVATAR_URL),
  deleteFile: jest.fn().mockResolvedValue(null),
};

let unlinkSyncSpy: jest.SpyInstance;
let fileExistsSpy: jest.SpyInstance;

let mockUsersRepo: IUserRepository;
let injector: ReflectiveInjector;
let userService: IUserService;

describe('UserService', () => {
  const roles: Role[] = ['USER', 'ADMIN', 'MOD', 'AUTHOR'];

  let initialPasswords: string[];
  let hashedPasswords: string[];

  let user: User;
  let author: User;
  let admin: User;
  let mod: User;

  let userProfile: Profile;

  beforeAll(async () => {
    initialPasswords = roles.map((_) =>
      passwordGenerator(USER_CONSTRAINTS.MAX_PASSWORD_LENGTH - 1),
    );
    hashedPasswords = await Promise.all(
      initialPasswords.map((pass) => hashPassword(pass)),
    );
  });

  beforeEach(async () => {
    await client.user.deleteMany();

    mockUsersRepo = new MockUserRepository();

    let users = [user, admin, mod, author];
    users = await Promise.all(
      roles.map((role, i) =>
        mockUsersRepo.create({
          email: `fake${role.toLowerCase()}123@gmail.com`,
          password: hashedPasswords[i],
          username: `fake${role.toLowerCase()}123`,
          role,
          isBanned: false,
        }),
      ),
    );

    [user, admin, mod, author] = users.map((u, i) => ({
      ...u,
      password: initialPasswords[i],
    }));

    userProfile = await client.profile.create({
      data: {
        userId: user.id,
        avatarURL: 'some-fancy-url/image.png',
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
      {
        provide: STORAGE_PROVIDER_TOKEN,
        useValue: mockStorageProvider,
      },
    ]);
    userService = injector.get(UserService) as UserService;

    jest.spyOn(mockUsersRepo, 'create');
    jest.spyOn(mockUsersRepo, 'delete');
    jest.spyOn(mockUsersRepo, 'update');

    jest.spyOn(mockStorageProvider, 'deleteFile');

    unlinkSyncSpy = jest.spyOn(fs, 'unlink').mockImplementation();
    fileExistsSpy = jest.spyOn(fs, 'existsSync').mockImplementation();
  });

  afterEach(() => jest.clearAllMocks());

  describe('getAll()', () => {
    it(`should return users profile details, excluding password always`, async () => {
      const res = await userService.getAll({});
      for (const item of res.items) {
        expect(item).toHaveProperty('profile');
        expect(item).not.toHaveProperty('password');
      }
    });

    describe('sorting', () => {
      test.each([
        ['contain invalid key', { invalidKey: 'asc' }],
        ['specify invalid direction', { username: 'invalid' }],
        ['specify valid direction but in the wrong case ', { username: 'ASC' }],
        ['specify valid direction but in an array', { username: ['asc'] }],
      ])('should throw when sorting options %s', async (_, sortBy) => {
        expect.assertions(1);

        return userService
          .getAll({
            sortBy: sortBy as any,
          })
          .catch((error) => {
            expect(error.message).toMatch(
              ERROR_MESSAGES[ERROR_CODES.VALIDATION.VALIDATION_ERROR],
            );
          });
      });

      test.each([
        ['username (ASC)', false],
        ['username (DESC)', true],
      ])(
        'should sort items provided that sorting by %s is applied',
        async (_, isDescending: boolean) => {
          const res = await userService.getAll({
            sortBy: {
              username: isDescending ? 'desc' : 'asc',
            },
          });
          const sortedItems = [...res.items].sort(
            sortObjectsByStringProp('username', isDescending ? 'desc' : 'asc'),
          );

          sortedItems.forEach((user, i) => {
            expect(user.id).toBe(res.items[i].id);
          });
        },
      );
    });

    describe('pagination', () => {
      const pageSizeOptions = PAGINATION.USERS.ITEMS_PER_PAGE_OPTIONS;
      test.each([
        ['negative page size', -1, 0],
        ['negative offset', 10, -1],
        ['floating point page size', 0.1, 0],
        ['floating point offset', 10, 2.5],
        ['string as page size', '0', 0],
        ['page size that is not allowed', 99, 0],
      ])('should throw when %s is set', async (_, pageSize, pageOffset) => {
        expect.assertions(1);
        // eslint-disable-next-line
        // @ts-ignore
        return userService.getAll({ pageSize, pageOffset }).catch((error) => {
          expect(error.message).toMatch(
            ERROR_MESSAGES[ERROR_CODES.VALIDATION.VALIDATION_ERROR],
          );
        });
      });

      test.each([
        [2, pageSizeOptions[0]],
        [4, pageSizeOptions[0]],
        [21, pageSizeOptions[1]],
        [49, pageSizeOptions[2]],
      ])(
        'should throw when pagination offset (%s) is not divisible by page size (%s)',
        async (pageOffset, pageSize) => {
          expect.assertions(1);
          return userService.getAll({ pageOffset, pageSize }).catch((error) => {
            expect(error.message).toMatch(
              ERROR_MESSAGES[ERROR_CODES.VALIDATION.VALIDATION_ERROR],
            );
          });
        },
      );

      test.each([
        [1, 0, pageSizeOptions[0]],
        [2, pageSizeOptions[0], pageSizeOptions[0]],
        [3, pageSizeOptions[0] * 2, pageSizeOptions[0]],
        [2, pageSizeOptions[1], pageSizeOptions[1]],
      ])(
        'should return page #%s when [ offset: %s ; pageLimit %s ]',
        async (expectedPageNum, pageOffset, pageSize) => {
          const resDto = await userService.getAll({
            pageOffset,
            pageSize,
          });
          expect(resDto.pagination.limit).toBe(pageSize);
          expect(resDto.pagination.page).toBe(expectedPageNum);
        },
      );
    });

    describe('filtering by role', () => {
      test.each(['Moderator', 'usr', 'administrator'])(
        'should throw when filtering by unknown user role',
        async (role) => {
          expect.assertions(1);
          return userService
            .getAll({
              filterBy: {
                role: role as any,
              },
            })
            .catch((error) => {
              expect(error.message).toMatch(/failed.*validation/i);
            });
        },
      );

      test(`it should return the correct amount of users when
         filtering by role`, async () => {
        for (const role of roles) {
          const resDto = await userService.getAll({
            filterBy: {
              role: role,
            },
          });
          expect(resDto.count).toBe(1);
          for (const user of resDto.items) expect(user.role).toBe(role);
        }
      });
    });

    describe('filtering by isBanned', () => {
      test.each([
        ['is one', 1],
        ['is zero', 0],
      ])(
        'should throw validation error when isBanned %s',
        async (_, isBanned) => {
          expect.assertions(1);
          return userService
            .getAll({
              filterBy: {
                isBanned: isBanned as any,
              },
            })
            .catch((error) => {
              expect(error.message).toMatch(/failed.*validation/i);
            });
        },
      );

      test(`it should return the correct amount of users when
         filtering by isBanned`, async () => {
        const bannedUsers = await Promise.all(
          new Array({ length: Math.floor(Math.random() * 10) + 1 }).map(
            (_, i) =>
              mockUsersRepo.create({
                email: `bannedFake${i}@gmail.com`,
                password: `bannedFake${i}Pass`,
                username: `bannedFake${i}`,
                role: 'USER',
                isBanned: true,
              }),
          ),
        );

        const resDto = await userService.getAll({
          filterBy: {
            isBanned: true,
          },
        });
        expect(resDto.count).toBe(bannedUsers.length);
        for (const item of resDto.items) expect(item.isBanned).toBe(true);
      });
    });

    describe('searching', () => {
      test.each([
        [
          'too long (longer than a username max length)',
          generateRandomString(USER_CONSTRAINTS.MAX_USERNAME_LENGTH + 1),
        ],
      ])('should throw when the search query is %s', async (_, searchQuery) => {
        expect.assertions(1);
        return userService.getAll({ searchQuery }).catch((error) => {
          expect(error.message).toMatch(
            ERROR_MESSAGES[ERROR_CODES.VALIDATION.VALIDATION_ERROR],
          );
        });
      });

      test.each(['user', 'admin', 'mod'])(
        'should find users by checking if username includes searchQuery (case insensitive)',
        async (searchQuery) => {
          const res = await userService.getAll({
            searchQuery,
          });

          expect(
            res.items.every((u) =>
              u.username.toLowerCase().includes(searchQuery.toLowerCase()),
            ),
          ).toBe(true);
        },
      );

      test.each([generateRandomString(10), 'tony_hackah'])(
        `should not return any result when search query (%s) 
      does not correspond to any username`,
        async (searchQuery) => {
          const res = await userService.getAll({
            searchQuery,
          });

          expect(res.pagination.total).toBe(0);
        },
      );
    });
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
      },
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
            ERROR_MESSAGES[ERROR_CODES.SERVER.NOT_FOUND],
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
      expect(updatedAuthor.profile.avatarURL).toBe('');
    });

    it('should set profile avatar url if valid avatar file is set', async () => {
      fileExistsSpy.mockReturnValueOnce(true);
      unlinkSyncSpy.mockReturnValueOnce(null);

      const res = await userService.update({
        userId: author.id,
        avatar: {
          path: 'some/file.png',
          extension: '.png',
          size: 10000,
        },
      });

      expect(mockStorageProvider.uploadFile).toHaveBeenCalledTimes(1);

      const updatedAuthor = res.user as UserDetail;
      if (!updatedAuthor.profile) throw new Error('Missing profile');

      expect(updatedAuthor.profile.avatarURL).toBe(AVATAR_URL);
    });

    it(`should call for deletion of previous avatar if one already set`, async () => {
      fileExistsSpy.mockReturnValueOnce(true);
      unlinkSyncSpy.mockReturnValueOnce(null);

      const userWithProfile = user; // Already has a profile with avatar
      const userWithoutProfile = author;

      for (const selectedUser of [userWithProfile, userWithoutProfile])
        await userService.update({
          userId: selectedUser.id,
          avatar: {
            path: 'some/file.png',
            extension: '.png',
            size: 10000,
          },
        });

      expect(mockStorageProvider.deleteFile).toHaveBeenCalledTimes(1);
    });

    it(`should not call for deletion of previous avatar if setting removeAvatar to "false"`, async () => {
      fileExistsSpy.mockReturnValueOnce(true);
      unlinkSyncSpy.mockReturnValueOnce(null);

      const userWithProfile = user;

      await userService.update({
        userId: userWithProfile.id,
        removeAvatar: false,
      });

      expect(mockStorageProvider.deleteFile).toHaveBeenCalledTimes(0);
    });

    it(`should call for deletion of previous avatar if setting removeAvatar to "true"`, async () => {
      fileExistsSpy.mockReturnValueOnce(true);
      unlinkSyncSpy.mockReturnValueOnce(null);

      const userWithProfile = user;

      await userService.update({
        userId: userWithProfile.id,
        removeAvatar: true,
      });

      expect(mockStorageProvider.deleteFile).toHaveBeenCalledTimes(1);
    });

    it(`should call for deletion of previous avatar if setting removeAvatar to "true" 
      regardless of avatar specified`, async () => {
      fileExistsSpy.mockReturnValueOnce(true);
      unlinkSyncSpy.mockReturnValueOnce(null);

      const userWithProfile = user;

      await userService.update({
        userId: userWithProfile.id,
        removeAvatar: true,
        avatar: {
          path: 'some/file.png',
          extension: '.png',
          size: 10000,
        },
      });

      expect(mockStorageProvider.deleteFile).toHaveBeenCalledTimes(1);
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
            USER_CONSTRAINTS.MAX_FIRST_NAME_LENGTH + 1,
          ),
        },
      ],
      [
        'first name is too short',
        {
          firstName: generateRandomString(
            USER_CONSTRAINTS.MIN_FIRST_NAME_LENGTH - 1,
          ),
        },
      ],
      [
        'last name is too long',
        {
          lastName: generateRandomString(
            USER_CONSTRAINTS.MAX_LAST_NAME_LENGTH + 1,
          ),
        },
      ],
      [
        'last name is too short',
        {
          lastName: generateRandomString(
            USER_CONSTRAINTS.MIN_LAST_NAME_LENGTH - 1,
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

    const VALID_AVATAR_DATA = {
      path: 'root/image.png',
      extension: randomSelect([
        ...USER_CONSTRAINTS.AVATAR_IMAGE_ALLOWED_EXTENSIONS,
      ]),
      size: USER_CONSTRAINTS.MAX_SIZE_AVATAR_IMAGE - 1,
    } as AvatarImageDto;

    test.each([
      [
        'has empty path',
        {
          ...VALID_AVATAR_DATA,
          path: '',
        },
      ],
      ...[
        'jif',
        '.rec.',
        '.docx',
        '.som',
        '.pdf',
        '.exe',
        '',
        null,
        undefined,
      ].map((ext) => [
        `has invalid extension ${ext}`,
        {
          ...VALID_AVATAR_DATA,
          extension: ext,
        },
      ]),
      [
        'is too big',
        {
          ...VALID_AVATAR_DATA,
          size: USER_CONSTRAINTS.MAX_SIZE_AVATAR_IMAGE + 1,
        },
      ],
    ])(
      'should return validation error when avatar file %s',
      async (_, avatar) => {
        expect.assertions(1);
        userService
          .update({
            userId: user.id,
            avatar: avatar as AvatarImageDto,
          })
          .catch((error) => {
            expect(error.message).toMatch(/failed.*validation/i);
          });
      },
    );

    it('should throw when user with that id does not exist', async () => {
      expect.assertions(1);
      return userService
        .update({
          userId: 9999,
        })
        .catch((error) => {
          expect(error.message).toMatch(
            ERROR_MESSAGES[ERROR_CODES.SERVER.NOT_FOUND],
          );
        });
    });
  });

  describe('changePassword()', () => {
    it(`should update password if new one is
       valid and old password matches current one`, async () => {
      const NEW_PASS = passwordGenerator(
        USER_CONSTRAINTS.MAX_PASSWORD_LENGTH - 1,
      );
      await userService.changePassword({
        userId: user.id,
        oldPassword: user.password,
        newPassword: NEW_PASS,
      });
      expect(mockUsersRepo.update).toHaveBeenCalledTimes(1);

      const updatedUser = await mockUsersRepo.getById(user.id.toString());
      if (!updatedUser) throw new Error('Failed to update password');

      // Updating your password should also hash
      // the new password like in registration service
      const isValidPassword = await validPassword(
        NEW_PASS,
        updatedUser.password,
      );
      expect(isValidPassword).toBe(true);
    });

    it(`should throw when old password doesn't match the current one`, async () => {
      expect.assertions(1);
      return userService
        .changePassword({
          userId: user.id,
          oldPassword: passwordGenerator(10),
          newPassword: passwordGenerator(10),
        })
        .catch((error) => {
          expect(error.message).toBe(
            ERROR_MESSAGES[ERROR_CODES.AUTH.INVALID_CREDENTIALS],
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
            ERROR_MESSAGES[ERROR_CODES.AUTH.SAME_PASSWORD],
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
            USER_CONSTRAINTS.MAX_PASSWORD_LENGTH - 1,
          ),
          newPassword: passwordGenerator(
            USER_CONSTRAINTS.MAX_PASSWORD_LENGTH - 1,
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
            USER_CONSTRAINTS.MAX_PASSWORD_LENGTH - 1,
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
            USER_CONSTRAINTS.MAX_PASSWORD_LENGTH - 1,
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
            USER_CONSTRAINTS.MAX_PASSWORD_LENGTH - 1,
          ),
          newPassword: passwordGenerator(
            USER_CONSTRAINTS.MAX_PASSWORD_LENGTH - 1,
          ),
        })
        .catch((error) => {
          expect(error.message).toMatch(
            ERROR_MESSAGES[ERROR_CODES.SERVER.NOT_FOUND],
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
            ERROR_MESSAGES[ERROR_CODES.SECURITY.ADMIN_PRIVILEGE_VIOLATION],
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
            ERROR_MESSAGES[ERROR_CODES.SECURITY.FORBIDDEN_PROMOTION],
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
      },
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
            ERROR_MESSAGES[ERROR_CODES.SERVER.NOT_FOUND],
          );
        });
    });
  });

  describe('changeBanStatus()', () => {
    test.each(['MOD', 'ADMIN'] as Role[])(
      'should ban/un-ban user if its done by %s',
      async (role) => {
        const userWithElevatedPrivileges = [mod, admin].find(
          (u) => u.role === role,
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
      },
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
            ERROR_MESSAGES[ERROR_CODES.SECURITY.MODERATION_CONFLICT],
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
              ERROR_MESSAGES[ERROR_CODES.SECURITY.SELF_ACTION_FORBIDDEN],
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
      },
    );

    test.each([
      ['is null', null],
      ['is undefined', undefined],
      ['is empty string', ''],
      ['is one', 1],
      ['is zero', 0],
    ])(
      'should throw validation error when isBanned %s',
      async (_, isBanned) => {
        expect.assertions(1);
        return userService
          .changeBanStatus({
            userId: mod.id,
            userToChangeId: 1,
            isBanned: isBanned as any,
          })
          .catch((error) => {
            expect(error.message).toMatch(/failed.*validation/i);
          });
      },
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
              ERROR_MESSAGES[ERROR_CODES.SERVER.NOT_FOUND],
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
      },
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
            ERROR_MESSAGES[ERROR_CODES.SERVER.FORBIDDEN],
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
              ERROR_MESSAGES[ERROR_CODES.SECURITY.ADMIN_PRIVILEGE_VIOLATION],
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
      },
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
              ERROR_MESSAGES[ERROR_CODES.SERVER.NOT_FOUND],
            );
          });
    });
  });
});
