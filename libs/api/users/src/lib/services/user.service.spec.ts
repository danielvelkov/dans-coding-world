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
} from '@dans-coding-world/shared-constants';
import { UserService, USER_REPOSITORY_TOKEN } from './user.service.js';
import { generateRandomString } from '@dans-coding-world/helpers';

let mockUsersRepo: IUserRepository;
let injector: ReflectiveInjector;
let userService: IUserService;

describe('UserService', () => {
  let user: User;
  let author: User;
  let admin: User;
  let mod: User;

  beforeEach(async () => {
    await client.user.deleteMany();

    mockUsersRepo = new MockUserRepository();

    const roles: Role[] = ['USER', 'ADMIN', 'MOD', 'AUTHOR'];

    [user, admin, mod, author] = await Promise.all(
      roles.map((role) =>
        mockUsersRepo.create({
          email: `fake${role.toLowerCase()}123@gmail.com`,
          password: `fake${role.toLowerCase()}Pass`,
          username: `fake${role.toLowerCase()}123`,
          role,
        })
      )
    );

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
    let userProfile: Profile;

    beforeEach(async () => {
      userProfile = await client.profile.create({
        data: {
          userId: user.id,
          avatarURL: 'URL',
          bio: '',
          firstName: 'Bang',
          lastName: 'Dong',
        },
      });
    });

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
});
