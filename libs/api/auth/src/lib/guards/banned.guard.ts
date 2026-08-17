import { ApiException } from '@dans-coding-world/api-exceptions';
import type { User } from '@dans-coding-world/prisma-schema';
import { ERROR_CODES } from '@dans-coding-world/shared-constants';
import { Request, Response, NextFunction } from 'express';
import { Authorized } from './authorized.guard.js';

/**
 * @summary Guard that blocks banned users.
 * @description Requires 'Authorized' guard to run first. This guard assumes req.user is populated.
 * @see {@link Authorized}
 * @example
 * ```typescript
 * export class CommentController {
 * ⠀@BlockBanned()
 *   async create() {
 *     // Only unbanned users can comment
 *   }
 */
export function BlockBanned() {
  return (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (
      req: Request,
      res: Response,
      next: NextFunction,
    ) {
      const user = req.user as User | undefined;

      if (!user) return next(new ApiException(ERROR_CODES.SERVER.FORBIDDEN));

      if (user.isBanned) return next(new ApiException(ERROR_CODES.AUTH.BANNED));

      return originalMethod.call(this, req, res, next);
    };
  };
}
