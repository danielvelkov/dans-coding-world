import type { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import {
  AttachUser,
  Authorized,
  ITokenService,
  RequiredRole,
} from '@dans-coding-world/api-auth';
import { IUserService } from '@dans-coding-world/api-users';
import { SUCCESS_MESSAGES } from '@dans-coding-world/shared-constants';
import { User } from '@dans-coding-world/prisma-schema';

export class UsersController {
  constructor(
    private userService: IUserService,
    private tokenService: ITokenService
  ) {
    this.revokeUserTokens = this.revokeUserTokens.bind(this);
    this.get = this.get.bind(this);
  }
  @Authorized()
  @RequiredRole('MOD', 'ADMIN')
  async revokeUserTokens(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const revokedTokens = await this.tokenService.revokeAllUserRefreshTokens(
        id
      );

      return res.status(StatusCodes.OK).json({
        message: SUCCESS_MESSAGES.AUTH.revoke,
        revokedCount: revokedTokens,
      });
    } catch (error) {
      return next(error);
    }
  }

  @AttachUser()
  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const viewer = req.user as User;

      const { id } = req.params;

      const { user } = await this.userService.getById({
        userId: id as any,
        viewerId: viewer?.id,
      });

      return res.status(StatusCodes.OK).json({
        message: SUCCESS_MESSAGES.USERS.get,
        user,
      });
    } catch (error) {
      return next(error);
    }
  }
}
