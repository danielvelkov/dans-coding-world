import { NextFunction, Request, Response } from 'express';
import passport from 'passport';
import type { User } from '@dans-coding-world/prisma-schema';
import {
  JWT_STRATEGY_NAME,
  PassportJwtStrategy,
} from '../strategies/jwt.strategy.js';
import { ApiException } from '@dans-coding-world/exceptions';
import { ERROR_CODES } from '@dans-coding-world/shared-constants';

/**
 * @summary Authorization guard that requires access token validation using JWT strategy.
 * @description Request population of the 'user' field. Works according to PassportJwtStrategy.
 * @see {@link PassportJwtStrategy}
 * @example
 * ```typescript
 * // NOTE! for decorators to work you must use methods, not class fields
 * // NOTE! you must also bind the method to "this" in the constructor
 * export class AuthController {
 *  constructor() {
 *    this.seeProfile = this.seeProfile.bind(this);
 *  }
 * ⠀@Authorized()
 *   async seeProfile() {
 *     // Only logged in users can see
 *   }
 */
export function Authorized() {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = function (
      req: Request,
      res: Response,
      next: NextFunction,
    ) {
      passport.authenticate(
        JWT_STRATEGY_NAME,
        { session: false },
        (error: Error, user: User) => {
          if (error) return next(error);

          if (!user)
            return next(new ApiException(ERROR_CODES.AUTH.UNAUTHORIZED));

          req.user = user;

          return originalMethod.call(this, req, res, next);
        },
      )(req, res, next);
    };
  };
}
