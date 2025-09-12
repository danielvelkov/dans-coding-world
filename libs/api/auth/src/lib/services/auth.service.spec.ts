import 'reflect-metadata';
import { LoginDto } from '@dans-coding-world/shared-auth-dto';
import { ReflectiveInjector } from 'injection-js';
import { TokenService, AUTH_CONFIG_TOKEN } from './token.service.js';
import {
  AuthService,
  TOKEN_SERVICE_TOKEN,
  USER_REPOSITORY_TOKEN,
} from './auth.service.js';
import config from '../config/auth.config.js';
import { hashPassword } from '../helper/password.helper.js';

const mockUserRepo = {
  get: jest.fn(async () => ({
    id: 1,
    email: 'fakeUser123@gmail.com',
    password: await hashPassword('fakeUser123'),
  })),
};

const injector = ReflectiveInjector.resolveAndCreate([
  AuthService,
  { provide: TOKEN_SERVICE_TOKEN, useClass: TokenService },
  { provide: USER_REPOSITORY_TOKEN, useValue: mockUserRepo },
  { provide: AUTH_CONFIG_TOKEN, useValue: config },
]);

const authService = injector.get(AuthService) as AuthService;

describe('Auth service', () => {
  describe('user login', () => {
    it('should provide access and refresh tokens on valid login', async () => {
      const loginDto: LoginDto = {
        email: 'fakeUser123@gmail.com',
        password: 'fakeUser123',
      };
      const response = await authService.login(loginDto);

      expect(response.accessToken).not.toBeNull();
      expect(response.refreshToken).not.toBeNull();
      expect(response.user.email).toBe(loginDto.email);
    });

    it('should throw an error on invalid credentials', async () => {
      const loginDto: LoginDto = {
        email: 'DOES_NOT_EXIST@gmail.com',
        password: 'fakeUser123',
      };
      authService.login(loginDto).catch((err) => {
        expect(err.message).toMatch(/credentials.*invalid/);
      });
    });

    it('should throw an error on wrong password', async () => {
      const loginDto: LoginDto = {
        email: 'fakeUser123@gmail.com',
        password: 'WRONG_PASS',
      };
      authService.login(loginDto).catch((err) => {
        expect(err.message).toMatch(/password.*wrong/);
      });
    });
  });
});
