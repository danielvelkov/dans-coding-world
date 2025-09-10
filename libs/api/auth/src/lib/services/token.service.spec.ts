import tokenService from './token.service.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { User } from '@dans-coding-world/prisma-schema';

describe('Token service', () => {
  const payload = { sub: '1' };
  const user = {
    id: 1,
  };
  const tokenSecret = crypto.randomBytes(64).toString('hex');

  testJwtGeneration(
    'Should generate JWT access token',
    () => tokenService.generateAccessToken(payload, tokenSecret),
    tokenSecret,
    payload
  );

  testJwtGeneration(
    'Should generate JWT refresh token',
    () => tokenService.generateRefreshToken(user as User, tokenSecret),
    tokenSecret,
    payload
  );
});

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

    it('should throw when secret is empty', async () => {
      expect(() => {
        tokenService.generateAccessToken({ userId: 1 }, '', 1);
      }).toThrow('secretOrPrivateKey must have a value');
    });
  });
}
