import { NextFunction, Request, Response } from 'express';
import passport from 'passport';
import type { User } from '@dans-coding-world/prisma-schema';
import {
  JWT_STRATEGY_NAME,
  PassportJwtStrategy,
} from '../strategies/jwt.strategy.js';

/**
 * @summary User guard that populates "req.user" field if access token validation using JWT strategy succeeds.
 * @description Request population of the 'user' field. Works according to PassportJwtStrategy.
 * @see {@link PassportJwtStrategy}
 * @example
 * ```typescript
 * export class AuthController {
 * ⠀@AttachUser()
 *   async seeProfile() {
 *      if(req.user)
 *        // logged in
 *      else
 *        // guest
 *   }
 */
export function AttachUser() {
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

          if (user) req.user = user;

          return originalMethod.call(this, req, res, next);
        },
      )(req, res, next);
    };
  };
}
