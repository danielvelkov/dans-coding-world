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
import { UpdateUserDto } from '@dans-coding-world/shared-user-dto';

export class UsersController {
  constructor(
    private userService: IUserService,
    private tokenService: ITokenService
  ) {
    this.revokeUserTokens = this.revokeUserTokens.bind(this);
    this.get = this.get.bind(this);
    this.update = this.update.bind(this);
    this.changePassword = this.changePassword.bind(this);
    this.changeRole = this.changeRole.bind(this);
    this.delete = this.delete.bind(this);
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

  @Authorized()
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const viewer = req.user as User;

      const updateUserDto: UpdateUserDto = {
        userId: viewer.id,
        ...req.body,
      };
      const { user } = await this.userService.update(updateUserDto);

      return res.status(StatusCodes.OK).json({
        message: SUCCESS_MESSAGES.USERS.update,
        user,
      });
    } catch (error) {
      return next(error);
    }
  }

  @Authorized()
  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user as User;

      const updatedUser = await this.userService.changePassword({
        userId: user.id,
        ...req.body,
      });

      return res.status(StatusCodes.OK).json({
        message: SUCCESS_MESSAGES.USERS.password,
        user: updatedUser,
      });
    } catch (error) {
      return next(error);
    }
  }

  @Authorized()
  @RequiredRole('ADMIN')
  async changeRole(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const changedUser = await this.userService.changeRole({
        userId: id as any,
        ...req.body,
      });

      return res.status(StatusCodes.OK).json({
        message: SUCCESS_MESSAGES.USERS.roleChange,
        user: changedUser,
      });
    } catch (error) {
      return next(error);
    }
  }

  @Authorized()
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user as User;
      const { id } = req.params;

      await this.userService.delete({
        userId: user.id,
        userToDeleteId: +id,
      });

      return res.status(StatusCodes.OK).json({
        message: SUCCESS_MESSAGES.USERS.delete,
      });
    } catch (error) {
      return next(error);
    }
  }
}
