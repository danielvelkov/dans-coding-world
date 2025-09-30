import 'reflect-metadata';
import {
  TokenService,
  AUTH_CONFIG_TOKEN,
  REFRESH_TOKEN_REPOSITORY_TOKEN,
} from './token.service.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { User } from '@dans-coding-world/prisma-schema';
import { ReflectiveInjector } from 'injection-js';
import { config } from '../config/auth.config.js';
import { IRefreshTokenRepository } from '@dans-coding-world/shared-data-access-interfaces';
import { MockRefreshTokenDataAccess as MockRefreshTokenRepository } from '@dans-coding-world/token-data-access';

let injector: ReflectiveInjector;
let tokenService: TokenService;
let mockRefreshTokenRepo: IRefreshTokenRepository;

describe('Token service', () => {
  describe('token generation', () => {
    const payload = { sub: '1' };
    const user = {
      id: 1,
    };
    const tokenSecret = crypto.randomBytes(64).toString('hex');
    injector = ReflectiveInjector.resolveAndCreate([
      TokenService,
      { provide: AUTH_CONFIG_TOKEN, useValue: config },
      {
        provide: REFRESH_TOKEN_REPOSITORY_TOKEN,
        useClass: MockRefreshTokenRepository,
      },
    ]);
    tokenService = injector.get(TokenService) as TokenService;

    testJwtGeneration(
      'Should generate JWT access token',
      () =>
        tokenService.generateAccessToken(payload, {
          secret: tokenSecret,
          expiresIn: 1,
        }),
      tokenSecret,
      payload
    );

    testJwtGeneration(
      'Should generate JWT refresh token',
      () =>
        tokenService.generateRefreshToken(user as User, {
          secret: tokenSecret,
          expiresIn: 1,
        }),
      tokenSecret,
      payload
    );

    it('should throw when secret is empty', async () => {
      expect(() => {
        tokenService.generateAccessToken(payload, {
          secret: '',
          expiresIn: 1,
        });
      }).toThrow('secretOrPrivateKey must have a value');
    });
  });
  describe('token revocation', () => {
    const TEST_TOKEN_JTI = '1';
    const TEST_USER_ID = '1';

    beforeEach(async () => {
      mockRefreshTokenRepo = new MockRefreshTokenRepository();
      mockRefreshTokenRepo.create(TEST_TOKEN_JTI, TEST_USER_ID, new Date());
      injector = ReflectiveInjector.resolveAndCreate([
        TokenService,
        { provide: AUTH_CONFIG_TOKEN, useValue: config },
        {
          provide: REFRESH_TOKEN_REPOSITORY_TOKEN,
          useValue: mockRefreshTokenRepo,
        },
      ]);
      tokenService = injector.get(TokenService) as TokenService;

      jest.spyOn(mockRefreshTokenRepo, 'update');
      jest.spyOn(mockRefreshTokenRepo, 'updateMany');
    });

    it('should set "revoke" flag to false when revoking individual token', async () => {
      const res = await tokenService.revokeRefreshToken(TEST_TOKEN_JTI);
      expect(mockRefreshTokenRepo.update).toHaveBeenCalledTimes(1);
      expect(res.revoked).toBe(true);
    });

    it('should throw when no such token exists', async () => {
      expect.assertions(1);
      return tokenService.revokeRefreshToken('NON-existent').catch((err) => {
        expect(err.message).toMatch(/token no longer exists/i);
      });
    });

    it('should set "revoke" flag to false when revoking all user tokens', async () => {
      await mockRefreshTokenRepo.create('2', TEST_USER_ID, new Date());
      await mockRefreshTokenRepo.create('3', 'NOT TEST USER ID', new Date());
      const res = await tokenService.revokeAllUserRefreshTokens(TEST_USER_ID);
      expect(mockRefreshTokenRepo.updateMany).toHaveBeenCalledTimes(1);
      expect(res.length).toBe(2);
      expect(res.some((t) => !t.revoked)).toBe(false);
    });

    it('should set "revoke" flag to false when all user tokens are revoked', async () => {
      await mockRefreshTokenRepo.create('2', TEST_USER_ID, new Date());
      await mockRefreshTokenRepo.create('3', TEST_USER_ID, new Date());
      const res = await tokenService.revokeAllRefreshTokens();
      expect(mockRefreshTokenRepo.updateMany).toHaveBeenCalledTimes(1);
      expect(res.length).toBe(3);
      expect(res.some((t) => !t.revoked)).toBe(false);
    });
  });
});

///// TEST HELPERS /////

function testJwtGeneration(
  description: string,
  generateToken: (...args: any[]) => string,
  secret: string,
  payload: any
) {
  describe(description, () => {
    let token: string;

    beforeEach(async () => {
      token = generateToken();
    });

    it('should contain 3 parts - header, payload, signature', () => {
      expect(token.split('.').length).toBe(3);
    });

    it('should contain payload', () => {
      expect(jwt.decode(token)).toEqual(expect.objectContaining(payload));
    });

    it('should provide payload on valid signature', () => {
      expect(jwt.verify(token, secret)).toEqual(
        expect.objectContaining(payload)
      );
    });

    it('should throw on token secret not matching', () => {
      expect(() => {
        jwt.verify(token, 'INVALID SECRET');
      }).toThrow('invalid signature');
    });
  });
}
