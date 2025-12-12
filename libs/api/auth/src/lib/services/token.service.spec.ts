import 'reflect-metadata';
import {
  TokenService,
  AUTH_CONFIG_TOKEN,
  REFRESH_TOKEN_REPOSITORY_TOKEN,
} from './token.service.js';
import crypto from 'crypto';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { client, User } from '@dans-coding-world/prisma-schema';
import { ReflectiveInjector } from 'injection-js';
import { config } from '../config/auth.config.js';
import { IRefreshTokenRepository } from '@dans-coding-world/shared-data-access-interfaces';
import { PrismaRefreshTokenDataAccess as MockRefreshTokenRepository } from '@dans-coding-world/token-data-access';
import {
  ERROR_CODES,
  ERROR_MESSAGES,
} from '@dans-coding-world/shared-constants';

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
    let token = '';
    const TEST_USER_ID = '1';

    beforeEach(async () => {
      await client.refreshToken.deleteMany();
      token = tokenService.generateRefreshToken({
        email: 'example@email.com',
        id: 1,
        password: 'password',
        role: 'USER',
        username: 'example',
        isBanned: false,
      });

      const { jti } = jwt.decode(token) as JwtPayload;
      if (!jti) throw new Error('Missing jti');

      mockRefreshTokenRepo = new MockRefreshTokenRepository();
      await mockRefreshTokenRepo.create(jti, TEST_USER_ID, new Date());

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

    it('should set "revoke" flag to false when revoking refresh token', async () => {
      const res = await tokenService.revokeRefreshToken({ token });

      expect(mockRefreshTokenRepo.update).toHaveBeenCalledTimes(1);
      expect(res.revoked).toBe(true);

      const dbEntry = await mockRefreshTokenRepo.getById(res.jti);
      expect(dbEntry?.revoked).toBe(true);
    });

    it('should throw when no such token id exists in db', async () => {
      const randomToken = tokenService.generateRefreshToken({
        email: 'example@email.com',
        id: -9999,
        password: 'password',
        role: 'USER',
        username: 'example',
        isBanned: false,
      });
      expect.assertions(1);
      return tokenService
        .revokeRefreshToken({ token: randomToken })
        .catch((err) => {
          expect(err.message).toMatch(
            ERROR_MESSAGES[ERROR_CODES.AUTH.TOKEN_NOT_FOUND]
          );
        });
    });

    it('should throw when token is invalid ', async () => {
      expect.assertions(1);
      return tokenService
        .revokeRefreshToken({ token: 'bad.token' })
        .catch((err) => {
          expect(err.message).toMatch(
            ERROR_MESSAGES[ERROR_CODES.VALIDATION.VALIDATION_ERROR]
          );
        });
    });

    it(`should set each token's "revoke" flag to false when revoking all user's tokens`, async () => {
      await mockRefreshTokenRepo.create('2', TEST_USER_ID, new Date());
      await mockRefreshTokenRepo.create('3', 'NOT TEST USER ID', new Date());
      const count = await tokenService.revokeAllUserRefreshTokens({
        userId: +TEST_USER_ID,
      });
      expect(mockRefreshTokenRepo.updateMany).toHaveBeenCalledTimes(1);
      expect(count).toBe(2);
      expect(
        (await mockRefreshTokenRepo.getUserTokens(TEST_USER_ID))?.some(
          (t) => !t.revoked
        )
      ).toBe(false);
    });

    it('should set "revoke" flag to false to every refresh token when all tokens are revoked', async () => {
      await mockRefreshTokenRepo.create('2', TEST_USER_ID, new Date());
      await mockRefreshTokenRepo.create('3', TEST_USER_ID, new Date());
      const count = await tokenService.revokeAllRefreshTokens();
      expect(mockRefreshTokenRepo.updateMany).toHaveBeenCalledTimes(1);
      expect(count).toBe(3);
      expect(
        (await mockRefreshTokenRepo.getAll())?.some((t) => !t.revoked)
      ).toBe(false);
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
