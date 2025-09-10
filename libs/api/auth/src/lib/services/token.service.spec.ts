import tokenService from './token.service.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
describe('Token service', () => {
  describe('Should generate a JWT access token', () => {
    let token: string;

    const payload = { id: 1 };
    const tokenSecret = crypto.randomBytes(64).toString('hex');

    beforeEach(() => {
      token = tokenService.generateAccessToken(payload, tokenSecret);
    });

    it('should contain 3 parts - header, payload, signature', () => {
      expect(token.split('.').length).toBe(3);
    });

    it('should contain payload', () => {
      expect(jwt.decode(token)).toEqual(expect.objectContaining(payload));
    });

    it('should provide payload on valid signature', () => {
      expect(jwt.verify(token, tokenSecret)).toEqual(
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
});
