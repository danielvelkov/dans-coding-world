import type { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { ITagsService } from '@dans-coding-world/api-posts';
import {
  CreateTagDto,
  DeleteTagDto,
  GetTagsDto,
  UpdateTagDto,
} from '@dans-coding-world/shared-post-dto';
import {
  Authorized,
  RequiredRole,
  AttachUser,
  BlockBanned,
} from '@dans-coding-world/api-auth';
import { SUCCESS_MESSAGES } from '@dans-coding-world/shared-constants';
import type { User } from '@dans-coding-world/prisma-schema';

export class TagsController {
  constructor(private tagsService: ITagsService) {
    this.getAll = this.getAll.bind(this);
    this.create = this.create.bind(this);
    this.update = this.update.bind(this);
    this.delete = this.delete.bind(this);
  }

  get = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const tag = await this.tagsService.getById({
        tagId: id as any,
      });

      return res.status(StatusCodes.OK).json({
        message: SUCCESS_MESSAGES.TAGS.get,
        tag,
      });
    } catch (error) {
      return next(error);
    }
  };

  @AttachUser()
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user as User;

      const getTagsDto: GetTagsDto = {
        viewerId: user?.id,
      };

      const tags = await this.tagsService.getAll(getTagsDto);

      return res.status(StatusCodes.OK).json({
        message: SUCCESS_MESSAGES.TAGS.getAll,
        ...tags,
      });
    } catch (error) {
      return next(error);
    }
  }

  @Authorized()
  @BlockBanned()
  @RequiredRole('ADMIN', 'AUTHOR')
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const tagDto: CreateTagDto = { ...req.body };

      const tag = await this.tagsService.create(tagDto);

      return res
        .status(StatusCodes.CREATED)
        .json({ message: SUCCESS_MESSAGES.TAGS.create, tag });
    } catch (error) {
      return next(error);
    }
  }

  @Authorized()
  @BlockBanned()
  @RequiredRole('ADMIN', 'AUTHOR')
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const deletePostDto: DeleteTagDto = { tagId: +id };

      await this.tagsService.delete(deletePostDto);

      return res
        .status(StatusCodes.OK)
        .json({ message: SUCCESS_MESSAGES.TAGS.delete });
    } catch (error) {
      return next(error);
    }
  }

  @Authorized()
  @BlockBanned()
  @RequiredRole('ADMIN', 'AUTHOR')
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const tagUpdateDto: UpdateTagDto = {
        tagId: id,
        ...req.body,
      };

      const tag = await this.tagsService.update(tagUpdateDto);

      return res
        .status(StatusCodes.OK)
        .json({ message: SUCCESS_MESSAGES.TAGS.update, tag });
    } catch (error) {
      return next(error);
    }
  }
}
