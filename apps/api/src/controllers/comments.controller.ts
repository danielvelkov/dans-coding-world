import type { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { ICommentsService } from '@dans-coding-world/api-posts';
import {
  CreateCommentDto,
  DeleteCommentDto,
  GetCommentDto,
  GetPostCommentsDto,
  UpdateCommentDto,
} from '@dans-coding-world/shared-post-dto';
import {
  Authorized,
  AttachUser,
  BlockBanned,
} from '@dans-coding-world/api-auth';
import { SUCCESS_MESSAGES } from '@dans-coding-world/shared-constants';
import { User } from '@dans-coding-world/prisma-schema';

export class CommentsController {
  constructor(private commentService: ICommentsService) {
    this.getPostComments = this.getPostComments.bind(this);
    this.get = this.get.bind(this);
    this.create = this.create.bind(this);
    this.update = this.update.bind(this);
    this.delete = this.delete.bind(this);
  }

  @AttachUser()
  async getPostComments(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user as User;
      const { postId } = req.params;
      const { depth } = req.query;

      const getPostCommentsDto: GetPostCommentsDto = {
        ...req.query,
        postId: +postId,
        viewerId: user?.id,
        maxReplyLevels: depth ? +depth : undefined,
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
  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user as User;
      const { postId, id } = req.params;
      const { depth } = req.query;

      const getCommentDto: GetCommentDto = {
        commentId: +id,
        postId: +postId,
        viewerId: user?.id,
        maxReplyLevels: depth ? +depth : undefined,
      };

      const result = await this.commentService.getById(getCommentDto);

      return res.status(StatusCodes.OK).json({
        ...result,
        message: SUCCESS_MESSAGES.COMMENTS.get,
      });
    } catch (error) {
      return next(error);
    }
  }

  @Authorized()
  @BlockBanned()
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user as User;
      const { postId } = req.params;

      const createCommentDto: CreateCommentDto = {
        ...req.body,
        postId,
        userId: user?.id,
      };

      const comment = await this.commentService.create(createCommentDto);

      return res.status(StatusCodes.OK).json({
        message: SUCCESS_MESSAGES.COMMENTS.create,
        comment,
      });
    } catch (error) {
      return next(error);
    }
  }

  @Authorized()
  @BlockBanned()
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user as User;
      const { postId, id } = req.params;

      const updateCommentDto: UpdateCommentDto = {
        ...req.body,
        commentId: +id,
        postId: +postId,
        userId: user?.id,
      };

      const comment = await this.commentService.update(updateCommentDto);

      return res.status(StatusCodes.OK).json({
        message: SUCCESS_MESSAGES.COMMENTS.update,
        comment,
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
      const { postId, id } = req.params;

      const deleteCommentDto: DeleteCommentDto = {
        commentId: +id,
        postId: +postId,
        authorId: user?.id,
      };

      const comment = await this.commentService.delete(deleteCommentDto);

      return res.status(StatusCodes.OK).json({
        message: SUCCESS_MESSAGES.COMMENTS.delete,
        comment,
      });
    } catch (error) {
      return next(error);
    }
  }
}
