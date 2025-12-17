import 'reflect-metadata';
import { LoginDto } from '@dans-coding-world/shared-auth-dto';
import { ReflectiveInjector } from 'injection-js';
import {
  TokenService,
  AUTH_CONFIG_TOKEN,
  TOKEN_SERVICE_TOKEN,
  REFRESH_TOKEN_REPOSITORY_TOKEN,
} from './token.service.js';
import { AuthService, USER_REPOSITORY_TOKEN } from './auth.service.js';
import { config } from '../config/auth.config.js';
import {
  IRefreshTokenRepository,
  IUserRepository,
} from '@dans-coding-world/shared-data-access-interfaces';
import { PrismaUserDataAccess as MockUserRepository } from '@dans-coding-world/user-data-access';
import { PrismaRefreshTokenDataAccess as MockRefreshTokenRepository } from '@dans-coding-world/token-data-access';
import { hashPassword } from '../helper/password.helper.js';
import { User, client } from '@dans-coding-world/prisma-schema';
import { decode, JwtPayload } from 'jsonwebtoken';

let mockUserRepo: IUserRepository;
let mockRefreshTokenRepo: IRefreshTokenRepository;

let injector: ReflectiveInjector;
let authService: AuthService;

const MOCK_USER: User = {
  email: 'fakeUser123@gmail.com',
  password: 'fakeUser123',
  username: 'fakeUser123',
  id: 1,
  role: 'USER',
  isBanned: false,
};

describe('Auth service', () => {
  beforeEach(async () => {
    mockUserRepo = new MockUserRepository();
    mockRefreshTokenRepo = new MockRefreshTokenRepository();

    await client.user.deleteMany({});
    await mockUserRepo.create({
      ...MOCK_USER,
      password: await hashPassword(MOCK_USER.password),
    });
    injector = ReflectiveInjector.resolveAndCreate([
      AuthService,
      {
        provide: REFRESH_TOKEN_REPOSITORY_TOKEN,
        useValue: mockRefreshTokenRepo,
      },
      { provide: TOKEN_SERVICE_TOKEN, useClass: TokenService },
      { provide: USER_REPOSITORY_TOKEN, useValue: mockUserRepo },
      { provide: AUTH_CONFIG_TOKEN, useValue: config },
    ]);

    authService = injector.get(AuthService) as AuthService;

    jest.spyOn(mockRefreshTokenRepo, 'delete');
  });
  describe('user login', () => {
    it('should provide access and refresh tokens on valid login', async () => {
      const loginDto: LoginDto = {
        email: MOCK_USER.email,
        password: MOCK_USER.password,
      };
      const response = await authService.login(loginDto);

      expect(response.accessToken).not.toBeNull();
      expect(response.refreshToken).not.toBeNull();
      expect(response.user.email).toBe(loginDto.email);
    });

    it('should throw an error on missing credentials', async () => {
      const loginDto: LoginDto = {
        email: '',
        password: '',
      };

      expect.assertions(1);
      return authService.login(loginDto).catch((err) => {
        expect(err.message).toMatch(/failed.*validation/i);
      });
    });

    it('should throw an error on wrong credentials', async () => {
      const loginDto: LoginDto = {
        email: 'DOES_NOT_EXIST@gmail.com',
        password: MOCK_USER.password,
      };
      expect.assertions(1);
      return authService.login(loginDto).catch((err) => {
        expect(err.message).toMatch(/credentials.*invalid/);
      });
    });

    it('should throw an error on wrong password', async () => {
      const loginDto: LoginDto = {
        email: MOCK_USER.email,
        password: 'WRONG_PASS',
      };
      expect.assertions(1);
      return authService.login(loginDto).catch((err) => {
        expect(err.message).toMatch(/password.*wrong/);
      });
    });
  });
  describe('refresh token', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });
    afterEach(() => {
      jest.useRealTimers();
    });
    it('should provide new access and refresh tokens on valid refresh token provided', async () => {
      const loginDto: LoginDto = {
        email: MOCK_USER.email,
        password: MOCK_USER.password,
      };
      const loginResponse = await authService.login(loginDto);

      const { accessToken, refreshToken } = loginResponse;

      const refreshResponse = await authService.refreshToken({
        token: refreshToken,
      });

      expect(mockRefreshTokenRepo.delete).toHaveBeenCalledTimes(1);
      expect(refreshResponse.accessToken).not.toBe(accessToken);
      expect(refreshResponse.refreshToken).not.toBe(refreshToken);
    });

    it('should provide new access and refresh tokens on valid refresh token provided (entry already in DB)', async () => {
      const tokenService = injector.get(TOKEN_SERVICE_TOKEN) as TokenService;

      const mockToken = tokenService.generateRefreshToken(MOCK_USER);

      const jti = getJti(mockToken);

      await client.refreshToken.create({
        data: {
          jti,
          revoked: false,
          userId: MOCK_USER.id,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + config.options.refreshExpiration),
        },
      });

      const refreshResponse = await authService.refreshToken({
        token: mockToken,
      });

      expect(mockRefreshTokenRepo.delete).toHaveBeenCalledTimes(1);
      expect(refreshResponse.refreshToken).not.toBe(mockToken);
    });

    test.each([
      '', // empty string
      '123.456', // missing third part
      'header.payload.signature.extra', // too many parts
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', // only header
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload', // missing signature
      'not.a.jwt.token', // invalid format
    ])('should throw if passed token is not even JWT', async (token) => {
      expect.assertions(1);
      return authService.refreshToken({ token }).catch((error) => {
        expect(error.message).toMatch(/failed.*validation/i);
      });
    });

    it('should throw if refresh token is revoked', async () => {
      const tokenService = injector.get(TOKEN_SERVICE_TOKEN) as TokenService;

      const mockToken = tokenService.generateRefreshToken(MOCK_USER);
      const jti = getJti(mockToken);

      await client.refreshToken.create({
        data: {
          jti,
          revoked: true, // token is 'revoked'
          userId: MOCK_USER.id,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + config.options.refreshExpiration),
        },
      });

      expect.assertions(1);
      return authService
        .refreshToken({ token: mockToken })
        .catch((error) =>
          expect(error.message).toMatch(/invalid or expired token/i)
        );
    });
    it('should throw if refresh token is expired', async () => {
      const tokenService = injector.get(TOKEN_SERVICE_TOKEN) as TokenService;

      const mockToken = tokenService.generateRefreshToken(MOCK_USER, {
        expiresIn: -1000,
        secret: config.options.refreshSecret,
      });
      const jti = getJti(mockToken);

      await client.refreshToken.create({
        data: {
          jti,
          revoked: true,
          userId: MOCK_USER.id,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() - 1000),
        },
      });

      expect.assertions(1);
      return authService
        .refreshToken({ token: mockToken })
        .catch((error) => expect(error.message).toMatch(/expired/i));
    });
    it('should throw if refresh token db entry is expired', async () => {
      const tokenService = injector.get(TOKEN_SERVICE_TOKEN) as TokenService;

      const mockToken = tokenService.generateRefreshToken(MOCK_USER);
      const jti = getJti(mockToken);

      await client.refreshToken.create({
        data: {
          jti,
          revoked: true,
          userId: MOCK_USER.id,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() - 10000),
        },
      });

      expect.assertions(1);
      return authService
        .refreshToken({ token: mockToken })
        .catch((error) => expect(error.message).toMatch(/invalid/i));
    });

    it('should throw if refresh token has expired with time', async () => {
      const tokenService = injector.get(TOKEN_SERVICE_TOKEN) as TokenService;

      const mockToken = tokenService.generateRefreshToken(MOCK_USER);
      const jti = getJti(mockToken);
      const expirationMs = config.options.refreshExpiration;

      const expirationDate = new Date(Date.now() + expirationMs);

      const tokenEntry = {
        jti,
        revoked: false,
        userId: MOCK_USER.id,
        createdAt: new Date(),
        expiresAt: expirationDate,
      };
      await client.refreshToken.create({
        data: tokenEntry,
      });

      // Advance to just before expiration
      jest.advanceTimersByTime(expirationMs - 5000);

      // Expect to run without fail
      const refreshResponse = await authService.refreshToken({
        token: mockToken,
      });

      expect.assertions(3);
      expect(mockRefreshTokenRepo.delete).toHaveBeenCalledWith(jti);
      expect(refreshResponse.refreshToken).not.toBe(mockToken);

      // Advance to just past expiration
      jest.advanceTimersByTime(expirationMs + 5000); // 5s + 1s buffer

      // Expect to fail as token has expired
      return authService
        .refreshToken({ token: refreshResponse.refreshToken })
        .catch((error) => expect(error.message).toMatch(/invalid/i));
    });

    it('should throw if refresh token owner does not exist', async () => {
      const tokenService = injector.get(TOKEN_SERVICE_TOKEN) as TokenService;

      const mockToken = tokenService.generateRefreshToken({
        ...MOCK_USER,
        id: -9999,
      });
      const jti = getJti(mockToken);

      await client.refreshToken.create({
        data: {
          jti,
          revoked: true,
          userId: MOCK_USER.id,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() - 10000),
        },
      });

      expect.assertions(1);
      return authService
        .refreshToken({ token: mockToken })
        .catch((error) => expect(error.message).toMatch(/invalid/i));
    });
  });
});

const getJti = (token: string) => {
  const res = decode(token) as JwtPayload;
  if (!res.jti) throw new Error('Invalid token');
  return res.jti;
};
