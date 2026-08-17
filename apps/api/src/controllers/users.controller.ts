import type { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import {
  AttachUser,
  Authorized,
  BlockBanned,
  ITokenService,
  RequiredRole,
} from '@dans-coding-world/api-auth';
import { IUserService } from '@dans-coding-world/api-users';
import { SUCCESS_MESSAGES } from '@dans-coding-world/shared-constants';
import type { User } from '@dans-coding-world/prisma-schema';
import {
  AvatarImageDto,
  GetUsersDto,
  UpdateUserDto,
} from '@dans-coding-world/shared-user-dto';
import path from 'path';

export class UsersController {
  constructor(
    private userService: IUserService,
    private tokenService: ITokenService,
  ) {
    this.revokeUserTokens = this.revokeUserTokens.bind(this);
    this.get = this.get.bind(this);
    this.getAll = this.getAll.bind(this);
    this.update = this.update.bind(this);
    this.changePassword = this.changePassword.bind(this);
    this.changeRole = this.changeRole.bind(this);
    this.changeBanStatus = this.changeBanStatus.bind(this);
    this.delete = this.delete.bind(this);
  }

  @Authorized()
  @BlockBanned()
  @RequiredRole('MOD', 'ADMIN')
  async revokeUserTokens(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const revokedTokens = await this.tokenService.revokeAllUserRefreshTokens({
        userId: id as any,
      });

      return res.status(StatusCodes.OK).json({
        message: SUCCESS_MESSAGES.AUTH.revoke,
        revokedCount: revokedTokens,
      });
    } catch (error) {
      return next(error);
    }
  }

  @Authorized()
  @BlockBanned()
  @RequiredRole('ADMIN')
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const getUsersDto: GetUsersDto = {
        ...req.query,
      };

      const usersWithMetadata = await this.userService.getAll(getUsersDto);

      return res.status(StatusCodes.OK).json({
        message: SUCCESS_MESSAGES.USERS.getAll,
        ...usersWithMetadata,
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
  @BlockBanned()
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const viewer = req.user as User;
      let avatar: AvatarImageDto | undefined;

      if (req.file)
        // populated by multer
        avatar = {
          path: req.file.path,
          size: req.file.size,
          extension: path.extname(req.file.originalname),
        };

      const updateUserDto: UpdateUserDto = {
        userId: viewer.id,
        ...req.body,
      };

      if (avatar) updateUserDto.avatar = avatar;

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
  @BlockBanned()
  @RequiredRole('ADMIN', 'MOD')
  async changeBanStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const banIssuer = req.user as User;
      const { id } = req.params;

      const changedUser = await this.userService.changeBanStatus({
        userId: banIssuer.id as any,
        userToChangeId: id as any,
        isBanned: req.body.isBanned,
      });

      return res.status(StatusCodes.OK).json({
        message: changedUser.isBanned
          ? SUCCESS_MESSAGES.USERS.banned
          : SUCCESS_MESSAGES.USERS.unbanned,
        user: changedUser,
      });
    } catch (error) {
      return next(error);
    }
  }

  @Authorized()
  @BlockBanned()
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
