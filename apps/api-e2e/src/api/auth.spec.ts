import {
  seedUsers,
  updateRefreshToken,
} from '@dans-coding-world/testing-setup';
import { BaseResponse } from '@dans-coding-world/api-types';
import {
  LoginResponseDto,
  RegistrationResponseDto,
} from '@dans-coding-world/shared-auth-dto';
import {
  login,
  renewAuthToken,
  findSetCookie,
  getJwtToken,
  register,
  getJti,
} from '../helper/authentication.helper.js';
import {
  createErrorCodeResponse,
  createValidationErrorResponse,
} from '../helper/error-response.helper.js';
import { User } from '@dans-coding-world/prisma-schema';
import {
  USER_CONSTRAINTS,
  VALIDATION_MESSAGES,
  SUCCESS_MESSAGES,
  ERROR_CODES,
} from '@dans-coding-world/shared-constants';
import { passwordGenerator } from '@dans-coding-world/api-auth';
import { IS_EMAIL, MIN_LENGTH, MATCHES } from 'class-validator';

let users: User[];

describe('/api/v1/auth', () => {
  afterAll(async () => {
    // Cleanup
    await seedUsers([], { clearExisting: true, useDefaults: false });
  });
  describe('POST /api/v1/auth/login', () => {
    beforeAll(async () => {
      users = await seedUsers();
    });
    it(`should return user data and set access and refresh tokens
       in 'Set-Cookie' header on valid credentials`, async () => {
      const res = await login(users[0].email, users[0].password);

      expect(res.status).toBe(200);
      const { data } = res.data as BaseResponse;
      expect((data as LoginResponseDto).user).not.toHaveProperty('password');
      expect(data).toHaveProperty('message', SUCCESS_MESSAGES.AUTH.login);

      const refreshTokenCookie = findSetCookie(res, 'refresh_token');
      const accessTokenCookie = findSetCookie(res, 'access_token');

      expect(getJwtToken(refreshTokenCookie)).toBeTruthy();
      expect(getJwtToken(accessTokenCookie)).toBeTruthy();

      expect(accessTokenCookie).toContain('HttpOnly');
      expect(refreshTokenCookie).toContain('HttpOnly');
    });

    test.each([
      ['', ''],
      ['user123@email.com', ''],
      ['', 'password123'],
    ])(
      'should return an error message on missing required fields',
      async ([username, password]) => {
        await expect(login(username, password)).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.VALIDATION.VALIDATION_ERROR)
        );
      }
    );

    it('should return an error message on invalid credentials', async () => {
      await expect(
        login('onomatopoeia@gmail.com', 'onomatopoeia123')
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.AUTH.INVALID_CREDENTIALS)
      );
    });

    it('should return an error message on wrong password provided', async () => {
      await expect(
        login(users[0].email, 'onomatopoeia123')
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.AUTH.INVALID_PASSWORD)
      );
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    let jwt = '';

    beforeEach(async () => {
      users = await seedUsers([], { clearExisting: true, useDefaults: true });

      if (!users[0]) throw new Error('Missing test user');

      const res = await login(users[0].email, users[0].password);

      const refreshTokenCookie = findSetCookie(res, 'refresh_token');

      jwt = getJwtToken(refreshTokenCookie);
    });

    it('should set new access and refresh token in set-cookie header on valid refresh token', async () => {
      const refreshRes = await renewAuthToken(jwt);

      const newRefreshTokenCookie = findSetCookie(refreshRes, 'refresh_token');
      const newAccessTokenCookie = findSetCookie(refreshRes, 'access_token');

      expect(getJwtToken(newRefreshTokenCookie)).toBeTruthy();
      expect(getJwtToken(newAccessTokenCookie)).toBeTruthy();

      expect(jwt).not.toBe(getJwtToken(newRefreshTokenCookie));

      expect(newAccessTokenCookie).toContain('HttpOnly');
      expect(newRefreshTokenCookie).toContain('HttpOnly');

      expect(refreshRes.status).toBe(200);
      const { data: refreshData } = refreshRes.data as BaseResponse;
      expect((refreshData as LoginResponseDto).user).not.toHaveProperty(
        'password'
      );
      expect(refreshData).toHaveProperty(
        'message',
        SUCCESS_MESSAGES.AUTH.token
      );
      expect(refreshData).toHaveProperty('user');
    });

    it('should return validation error message if string is not JWT token', async () => {
      return await expect(
        renewAuthToken('123.12312.123.3123')
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.VALIDATION.VALIDATION_ERROR)
      );
    });

    test.each([
      [
        'token expiring last minute',
        {
          expiresAt: new Date(Date.now() - 1000 * 60),
        },
      ],
      [
        'token being revoked',
        {
          revoked: true,
        },
      ],
      [
        'token changing users',
        {
          userId: 2,
        },
      ],
    ])(
      'should return invalid token error message on %s',
      async (_, tokenUpdateData) => {
        await updateRefreshToken({ ...tokenUpdateData, jti: getJti(jwt) });
        return await expect(renewAuthToken(jwt)).rejects.toMatchObject(
          createErrorCodeResponse(ERROR_CODES.AUTH.INVALID_TOKEN)
        );
      }
    );
  });

  describe('POST /api/v1/auth/register', () => {
    const VALID_USER_DATA = {
      email: 'totalyValidEmail@gmail.com',
      password: passwordGenerator(USER_CONSTRAINTS.MIN_PASSWORD_LENGTH + 1),
      username: 'totallyValid13',
    };
    beforeAll(async () => {
      await seedUsers([], { clearExisting: true, useDefaults: false });
    });
    it('should return created user data on valid registration data', async () => {
      const res = await register(
        VALID_USER_DATA.email,
        VALID_USER_DATA.password,
        VALID_USER_DATA.username
      );

      expect(res.status).toBe(201); // 201 CREATED
      const { data } = res.data as BaseResponse;
      expect((data as RegistrationResponseDto).user).not.toHaveProperty(
        'password'
      );
      expect(data).toHaveProperty('message', SUCCESS_MESSAGES.AUTH.register);
    });
    it('should return an error when trying to register an existing user with the same username or email', async () => {
      await seedUsers([{ ...VALID_USER_DATA, id: 1, role: 'USER' }], {
        clearExisting: true,
        useDefaults: false,
      });

      // Same username
      await expect(
        register(
          'mockEmail13@gmail.com',
          VALID_USER_DATA.password,
          VALID_USER_DATA.username
        )
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.VALIDATION.USER_EXISTS)
      );

      // Same email
      await expect(
        register(
          VALID_USER_DATA.email,
          VALID_USER_DATA.password,
          'veryCoolUser13'
        )
      ).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.VALIDATION.USER_EXISTS)
      );
    });

    test.each([
      [
        'email is empty',
        'username123',
        passwordGenerator(USER_CONSTRAINTS.MIN_PASSWORD_LENGTH + 1),
        '',
        'email',
        { [IS_EMAIL]: VALIDATION_MESSAGES.email.invalidEmail },
      ],
      [
        'email is invalid',
        'username123',
        passwordGenerator(USER_CONSTRAINTS.MIN_PASSWORD_LENGTH + 1),
        'invalid-email',
        'email',
        { [IS_EMAIL]: VALIDATION_MESSAGES.email.invalidEmail },
      ],
      [
        'username is empty',
        '',
        passwordGenerator(USER_CONSTRAINTS.MIN_PASSWORD_LENGTH + 1),
        'valid@email.com',
        'username',
        {
          [MIN_LENGTH]: VALIDATION_MESSAGES.minLength(
            USER_CONSTRAINTS.MIN_USERNAME_LENGTH
          ),
        },
      ],
      [
        'username is too short',
        'us',
        passwordGenerator(USER_CONSTRAINTS.MIN_PASSWORD_LENGTH + 1),
        'valid@email.com',
        'username',
        {
          [MIN_LENGTH]: VALIDATION_MESSAGES.minLength(
            USER_CONSTRAINTS.MIN_USERNAME_LENGTH
          ),
        },
      ],
      [
        'username is not alphanumeric',
        'username@123',
        passwordGenerator(USER_CONSTRAINTS.MIN_PASSWORD_LENGTH + 1),
        'valid@email.com',
        'username',
        {
          [MATCHES]: VALIDATION_MESSAGES.username.invalid,
        },
      ],
      [
        'password is empty',
        'username123',
        '',
        'valid@email.com',
        'password',
        {
          [MIN_LENGTH]: VALIDATION_MESSAGES.minLength(
            USER_CONSTRAINTS.MIN_PASSWORD_LENGTH
          ),
        },
      ],
      [
        'password is too short',
        'username123',
        passwordGenerator(USER_CONSTRAINTS.MIN_USERNAME_LENGTH - 1),
        'valid@email.com',
        'password',
        {
          [MIN_LENGTH]: VALIDATION_MESSAGES.minLength(
            USER_CONSTRAINTS.MIN_PASSWORD_LENGTH
          ),
        },
      ],
    ])(
      'should return validation error when %s',
      async (_, username, password, email, property, constraints) => {
        await expect(register(email, password, username)).rejects.toMatchObject(
          createValidationErrorResponse([{ field: property, constraints }])
        );
      }
    );
  });
});
