import 'reflect-metadata';
import { RegisterDto } from '@dans-coding-world/shared-auth-dto';
import { ReflectiveInjector } from 'injection-js';
import { USER_REPOSITORY_TOKEN } from './auth.service.js';
import { RegistrationService } from './registration.service.js';
import { IUserRepository } from '@dans-coding-world/shared-data-access-interfaces';
import { PrismaUserDataAccess as MockUserRepository } from '@dans-coding-world/user-data-access';
import { User, client } from '@dans-coding-world/prisma-schema';
import { USER_CONSTRAINTS } from '@dans-coding-world/shared-constants';
import { passwordGenerator } from '../helper/password.helper.js';

let mockUserRepo: IUserRepository;

let injector: ReflectiveInjector;
let registrationService: RegistrationService;

const REGISTRATION_DATA: User = {
  email: 'fakeUser123@gmail.com',
  password: passwordGenerator(USER_CONSTRAINTS.MIN_PASSWORD_LENGTH + 2),
  username: 'fakeUser123',
  id: 1,
  role: 'USER',
};

describe('Registration service', () => {
  beforeEach(async () => {
    mockUserRepo = new MockUserRepository();
    injector = ReflectiveInjector.resolveAndCreate([
      RegistrationService,
      { provide: USER_REPOSITORY_TOKEN, useValue: mockUserRepo },
    ]);

    registrationService = injector.get(
      RegistrationService
    ) as RegistrationService;

    jest.spyOn(mockUserRepo, 'create');
  });
  describe('register method', () => {
    beforeEach(async () => {
      await client.user.deleteMany({});
    });
    it('should create an user if data passes validation and user does not exist in db', async () => {
      const registerDto: RegisterDto = {
        email: REGISTRATION_DATA.email,
        password: REGISTRATION_DATA.password,
        username: REGISTRATION_DATA.username,
      };
      const response = await registrationService.register(registerDto);

      expect(mockUserRepo.create).toHaveBeenCalled();

      expect(response.user).not.toBeNull();
      expect(response.user.id).not.toBeNull();
      expect(response.user.email).toBe(registerDto.email);
      expect(response.user.role).toBe('USER');
    });

    it('should throw on missing credentials', async () => {
      const registerDto: RegisterDto = {
        email: '',
        password: REGISTRATION_DATA.password,
        username: '',
      };

      expect.assertions(2);
      expect(mockUserRepo.create).not.toHaveBeenCalled();

      return registrationService.register(registerDto).catch((err) => {
        expect(err.message).toMatch(/failed.*validation/i);
      });
    });

    it('should throw when a user with the same username or email tries to register', async () => {
      const registerDto: RegisterDto = {
        email: REGISTRATION_DATA.email,
        password: REGISTRATION_DATA.password,
        username: REGISTRATION_DATA.username,
      };
      await registrationService.register(registerDto);

      let newRegisterDto: RegisterDto = {
        email: REGISTRATION_DATA.email,
        password: passwordGenerator(USER_CONSTRAINTS.MIN_PASSWORD_LENGTH + 1),
        username: 'username1234',
      };

      expect.assertions(2);
      registrationService.register(newRegisterDto).catch((err) => {
        expect(err.message).toMatch(/User.*already exists/i);
      });

      newRegisterDto = {
        email: 'totalyNewEmail123@gmail.com',
        password: passwordGenerator(USER_CONSTRAINTS.MIN_PASSWORD_LENGTH + 1),
        username: REGISTRATION_DATA.username,
      };

      return registrationService.register(newRegisterDto).catch((err) => {
        expect(err.message).toMatch(/User.*already exists/i);
      });
    });

    test.each([
      ['is missing "@" symbol', 'invalidemail.com'],
      ['has no domain', 'user@'],
      ['has no local part', '@domain.com'],
      ['has spaces', 'user name@domain.com'],
      ['is empty string', ''],
      ['is too short', 'a@b.c'],
      ['is too long', 'a'.repeat(300) + '@example.com'],
    ])('should throw when email %s', async (description, email) => {
      const registerDto: RegisterDto = {
        email,
        password: REGISTRATION_DATA.password,
        username: REGISTRATION_DATA.username,
      };
      expect.assertions(2);
      expect(mockUserRepo.create).not.toHaveBeenCalled();
      return registrationService.register(registerDto).catch((err) => {
        expect(err.message).toMatch(/failed.*validation/);
      });
    });

    test.each([
      [
        'is too short',
        generateAlphanumeric(USER_CONSTRAINTS.MIN_USERNAME_LENGTH - 1),
      ],
      [
        'is too long',
        generateAlphanumeric(USER_CONSTRAINTS.MAX_USERNAME_LENGTH + 1),
      ],
      ['includes symbols other than underscore ', 'username%!@#$^&*()'],
      ['has spaces', 'user name231'],
      ['is empty string', ''],
    ])('should throw when username %s', async (_, username) => {
      const registerDto: RegisterDto = {
        email: REGISTRATION_DATA.email,
        password: REGISTRATION_DATA.password,
        username,
      };
      expect.assertions(2);
      expect(mockUserRepo.create).not.toHaveBeenCalled();
      return registrationService.register(registerDto).catch((err) => {
        expect(err.message).toMatch(/failed.*validation/);
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
    ])('should throw when password %s', async (description, password) => {
      const registerDto: RegisterDto = {
        email: REGISTRATION_DATA.email,
        password: password,
        username: REGISTRATION_DATA.username,
      };
      expect.assertions(2);
      expect(mockUserRepo.create).not.toHaveBeenCalled();
      return registrationService.register(registerDto).catch((err) => {
        expect(err.message).toMatch(/failed.*validation/);
      });
    });
  });
});

function generateAlphanumeric(length: number) {
  return passwordGenerator(length, {
    includeLowercase: true,
    includeNumbers: true,
    includeSymbols: false,
    includeUppercase: true,
  });
}
