import type { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import {
  Authorized,
  ITokenService,
  RequiredRole,
} from '@dans-coding-world/api-auth';
import { SUCCESS_MESSAGES } from '@dans-coding-world/shared-constants';

export class UsersController {
  constructor(private tokenService: ITokenService) {
    this.revokeUserTokens = this.revokeUserTokens.bind(this);
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
}
