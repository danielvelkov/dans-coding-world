import type { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { IPostsService } from '@dans-coding-world/api-posts';
import {
  CreatePostDto,
  UpdatePostDto,
  DeletePostDto,
  GetPostsDto,
} from '@dans-coding-world/shared-post-dto';
import {
  Authorized,
  RequiredRole,
  AttachUser,
} from '@dans-coding-world/api-auth';
import { SUCCESS_MESSAGES } from '@dans-coding-world/shared-constants';
import { User } from '@dans-coding-world/prisma-schema';

export class PostsController {
  constructor(private postsService: IPostsService) {
    this.get = this.get.bind(this);
    this.getAll = this.getAll.bind(this);
    this.create = this.create.bind(this);
    this.update = this.update.bind(this);
    this.delete = this.delete.bind(this);
  }
  @AttachUser()
  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = req.user as User;

      const post = await this.postsService.getById({
        postId: +id,
        viewerId: user?.id,
      });

      return res.status(StatusCodes.OK).json({
        message: SUCCESS_MESSAGES.POSTS.get,
        post,
      });
    } catch (error) {
      return next(error);
    }
  }

  @AttachUser()
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user as User;

      const getPostsDto: GetPostsDto = {
        viewerId: user?.id,
        ...req.query,
      };

      const postsWithMetadata = await this.postsService.getAll(getPostsDto);

      return res.status(StatusCodes.OK).json({
        message: SUCCESS_MESSAGES.POSTS.getAll,
        ...postsWithMetadata,
      });
    } catch (error) {
      return next(error);
    }
  }

  @Authorized()
  @RequiredRole('ADMIN')
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user as User;

      const postDto: CreatePostDto = { ...req.body, authorId: user.id };

      const post = await this.postsService.create(postDto);

      return res
        .status(StatusCodes.CREATED)
        .json({ message: SUCCESS_MESSAGES.POSTS.create, post });
    } catch (error) {
      return next(error);
    }
  }

  @Authorized()
  @RequiredRole('ADMIN')
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = req.user as User;

      const deletePostDto: DeletePostDto = { postId: +id, authorId: +user.id };

      await this.postsService.delete(deletePostDto);

      return res
        .status(StatusCodes.OK)
        .json({ message: SUCCESS_MESSAGES.POSTS.delete });
    } catch (error) {
      return next(error);
    }
  }

  @Authorized()
  @RequiredRole('ADMIN')
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const user = req.user as User;

      const postUpdateDto: UpdatePostDto = {
        ...req.body,
        postId: id,
        userId: +user.id,
      };

      const post = await this.postsService.update(postUpdateDto);

      return res
        .status(StatusCodes.OK)
        .json({ message: SUCCESS_MESSAGES.POSTS.update, post });
    } catch (error) {
      return next(error);
    }
  }
}
