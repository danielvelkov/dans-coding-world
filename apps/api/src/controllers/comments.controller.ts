import type { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import {
  ICommentsService,
  CommentsService,
} from '@dans-coding-world/api-posts';
import {
  GetPostCommentRepliesDto,
  GetPostCommentsDto,
} from '@dans-coding-world/shared-post-dto';
import { Authorized, AttachUser } from '@dans-coding-world/api-auth';
import { SUCCESS_MESSAGES } from '@dans-coding-world/shared-constants';
import { User } from '@dans-coding-world/prisma-schema';

export class CommentsController {
  constructor(private commentService: ICommentsService) {
    this.getPostComments = this.getPostComments.bind(this);
    this.getCommentReplies = this.getCommentReplies.bind(this);
    this.create = this.create.bind(this);
    this.update = this.update.bind(this);
    this.delete = this.delete.bind(this);
  }

  @AttachUser()
  async getPostComments(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user as User;
      const { id } = req.params;

      const getPostCommentsDto: GetPostCommentsDto = {
        ...req.query,
        postId: +id,
        viewerId: user?.id,
      };

      const result = await this.commentService.getPostComments(
        getPostCommentsDto
      );

      return res.status(StatusCodes.OK).json({
        ...result,
        message: SUCCESS_MESSAGES.COMMENTS.getPostsComments,
      });
    } catch (error) {
      return next(error);
    }
  }

  @AttachUser()
  async getCommentReplies(req: Request, res: Response, next: NextFunction) {
    try {
      throw new Error('Not implemented');
    } catch (error) {
      next(error);
    }
  }

  @Authorized()
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      throw new Error('Not implemented');
    } catch (error) {
      next(error);
    }
  }

  @Authorized()
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      throw new Error('Not implemented');
    } catch (error) {
      next(error);
    }
  }

  @Authorized()
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      throw new Error('Not implemented');
    } catch (error) {
      next(error);
    }
  }
}

type PageSizes = Parameters<CommentsService['getPostComments']>[0]['pageSize'];
