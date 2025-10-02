import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { ITokenService } from '@dans-coding-world/api-auth';
import { SUCCESS_MESSAGES } from '@dans-coding-world/shared-constants';

export class UsersController {
  constructor(private tokenService: ITokenService) {}
  revokeUserTokens = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
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
  };
}
