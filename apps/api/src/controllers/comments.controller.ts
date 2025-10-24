import type { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import {
  ICommentsService,
  CommentsService,
} from '@dans-coding-world/api-posts';
import {} from '@dans-coding-world/shared-post-dto';
import { Authorized, AttachUser } from '@dans-coding-world/api-auth';
import { SUCCESS_MESSAGES } from '@dans-coding-world/shared-constants';
import { User } from '@dans-coding-world/prisma-schema';

export class CommentsController {
  constructor(private commentService: ICommentsService) {}

  @AttachUser()
  async getPostComments(req: Request, res: Response, next: NextFunction) {
    try {
      const viewerId = req.user ? (req.user as User).id : null;
      const { postId } = req.params;
      const { limit, offset, orderBy } = req.query;
      console.log(postId);
      console.log({ limit, offset, orderBy });

      const result = await this.commentService.getPostComments({
        postId: Number(postId),
        viewerId: Number(viewerId),
        pageOffset: Number(offset),
        pageSize: Number(limit) as PageSizes,
        sortBy: {
          createdAt: 'desc',
        },
      });
      console.log({ result });

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
