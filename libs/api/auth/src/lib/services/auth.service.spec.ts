import { LoginDto } from '@dans-coding-world/shared-auth-dto';
import authService from './auth.service.js';

jest.mock('@dans-coding-world/user-data-access');

describe('Auth service', () => {
  describe('user login', () => {
    it('should provide access and refresh tokens on valid login', async () => {
      const loginDto: LoginDto = {
        email: 'moderator123@gmail.com',
        password: 'moderator123',
      };
      const response = await authService.login(loginDto);

      expect(response.accessToken).not.toBeNull();
      expect(response.refreshToken).not.toBeNull();
      expect(response.user.email).toBe(loginDto.email);
    });

    it('should throw an error on invalid credentials', async () => {
      const loginDto: LoginDto = {
        email: 'DOES_NOT_EXIST@gmail.com',
        password: 'moderator123',
      };
      authService.login(loginDto).catch((err) => {
        expect(err.message).toMatch(/credentials.*invalid/);
      });
    });

    it('should throw an error on wrong password', async () => {
      const loginDto: LoginDto = {
        email: 'moderator123@gmail.com',
        password: 'WRONG_PASS',
      };
      authService.login(loginDto).catch((err) => {
        expect(err.message).toMatch(/password.*wrong/);
      });
    });
  });
});
