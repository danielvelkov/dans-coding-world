import { ApiException } from '@dans-coding-world/exceptions';
import type { Role, User } from '@dans-coding-world/prisma-schema';
import { ERROR_CODES } from '@dans-coding-world/shared-constants';
import { Request, Response, NextFunction } from 'express';
import { Authorized } from './authorized.guard.js';

/**
 * @summary Role-based authorization guard that enforces access control based on user roles.
 * @description Requires 'Authorized' guard to run first. This guard assumes req.user is populated.
 * @see {@link Authorized}
 * @param roles The list of roles that have access to the endpoint.
 * @example
 * ```typescript
 * export class AuthController {
 * ⠀@RequiredRole('ADMIN')
 *   async deleteUser() {
 *     // Only admins can access this endpoint
 *   }
 */
export function RequiredRole(...roles: Role[]) {
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

      if (!roles.includes(user.role))
        return next(new ApiException(ERROR_CODES.SERVER.FORBIDDEN));

      return originalMethod.call(this, req, res, next);
    };
  };
}
