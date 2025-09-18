import 'reflect-metadata';
import { LoginDto } from '@dans-coding-world/shared-auth-dto';
import { ReflectiveInjector } from 'injection-js';
import { TokenService, AUTH_CONFIG_TOKEN } from './token.service.js';
import {
  AuthService,
  TOKEN_SERVICE_TOKEN,
  USER_REPOSITORY_TOKEN,
  REFRESH_TOKEN_REPOSITORY_TOKEN,
} from './auth.service.js';
import config from '../config/auth.config.js';
import {
  IRefreshTokenRepository,
  IUserRepository,
} from '@dans-coding-world/shared-data-access-interfaces';
import { MockUserDataAccess as MockUserRepository } from '@dans-coding-world/user-data-access';
import { MockRefreshTokenDataAccess as MockRefreshTokenRepository } from '@dans-coding-world/token-data-access';
import { hashPassword } from '../helper/password.helper.js';
import { User } from '@dans-coding-world/prisma-schema';

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
};

describe('Auth service', () => {
  beforeEach(async () => {
    mockUserRepo = new MockUserRepository();
    mockUserRepo.create({
      ...MOCK_USER,
      password: await hashPassword(MOCK_USER.password),
    });
    mockRefreshTokenRepo = new MockRefreshTokenRepository();
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

    it('should throw an error on invalid credentials', async () => {
      const loginDto: LoginDto = {
        email: 'DOES_NOT_EXIST@gmail.com',
        password: MOCK_USER.password,
      };
      authService.login(loginDto).catch((err) => {
        expect(err.message).toMatch(/credentials.*invalid/);
      });
    });

    it('should throw an error on wrong password', async () => {
      const loginDto: LoginDto = {
        email: MOCK_USER.email,
        password: 'WRONG_PASS',
      };
      authService.login(loginDto).catch((err) => {
        expect(err.message).toMatch(/password.*wrong/);
      });
    });
  });
  describe('refresh token', () => {
    it('should provide new access and refresh tokens on valid refresh token provided', async () => {
      const loginDto: LoginDto = {
        email: MOCK_USER.email,
        password: MOCK_USER.password,
      };
      const loginResponse = await authService.login(loginDto);

      const { accessToken, refreshToken } = loginResponse;

      const refreshResponse = await authService.refreshToken(refreshToken);

      expect(mockRefreshTokenRepo.delete).toHaveBeenCalledTimes(1);
      expect(refreshResponse.accessToken).not.toBe(accessToken);
      expect(refreshResponse.refreshToken).not.toBe(refreshToken);
    });

    it('should provide new access and refresh tokens on valid refresh token provided (entry already in DB)', async () => {
      const tokenService = injector.get(TOKEN_SERVICE_TOKEN) as TokenService;

      const mockToken = tokenService.generateRefreshToken(MOCK_USER);

      (mockRefreshTokenRepo as MockRefreshTokenRepository).tokens.push({
        token: await hashPassword(mockToken),
        revoked: false,
        userId: MOCK_USER.id,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + config.options.refreshExpiration),
      });
      const refreshResponse = await authService.refreshToken(mockToken);

      expect(mockRefreshTokenRepo.delete).toHaveBeenCalledTimes(1);
      expect(refreshResponse.refreshToken).not.toBe(mockToken);
    });

    it('should throw if refresh token is revoked', async () => {
      const tokenService = injector.get(TOKEN_SERVICE_TOKEN) as TokenService;

      const mockToken = tokenService.generateRefreshToken(MOCK_USER);

      (mockRefreshTokenRepo as MockRefreshTokenRepository).tokens.push({
        token: await hashPassword(mockToken),
        revoked: true,
        userId: MOCK_USER.id,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      });

      authService.refreshToken(mockToken).catch((err) => {
        expect(err.message).toMatch(/invalid token/i);
      });
    });
    it('should throw if refresh token is expired', async () => {
      const tokenService = injector.get(TOKEN_SERVICE_TOKEN) as TokenService;

      const mockToken = tokenService.generateRefreshToken(MOCK_USER, {
        expiresIn: -1000,
        secret: config.options.refreshSecret,
      });

      (mockRefreshTokenRepo as MockRefreshTokenRepository).tokens.push({
        token: await hashPassword(mockToken),
        revoked: true,
        userId: MOCK_USER.id,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 1000),
      });

      authService.refreshToken(mockToken).catch((err) => {
        expect(err.message).toMatch(/expired/i);
      });
    });
    it('should throw if refresh token db entry is expired', async () => {
      const tokenService = injector.get(TOKEN_SERVICE_TOKEN) as TokenService;

      const mockToken = tokenService.generateRefreshToken(MOCK_USER);

      (mockRefreshTokenRepo as MockRefreshTokenRepository).tokens.push({
        token: await hashPassword(mockToken),
        revoked: true,
        userId: MOCK_USER.id,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() - 100000000),
      });

      authService.refreshToken(mockToken).catch((err) => {
        expect(err.message).toMatch(/invalid/i);
      });
    });

    it('should throw if refresh token owner does not exist', async () => {
      const tokenService = injector.get(TOKEN_SERVICE_TOKEN) as TokenService;

      const mockToken = tokenService.generateRefreshToken({
        ...MOCK_USER,
        id: -9999,
      });

      (mockRefreshTokenRepo as MockRefreshTokenRepository).tokens.push({
        token: await hashPassword(mockToken),
        revoked: true,
        userId: -9999,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 1000),
      });

      authService.refreshToken(mockToken).catch((err) => {
        expect(err.message).toMatch(/invalid/i);
      });
    });
  });
});
