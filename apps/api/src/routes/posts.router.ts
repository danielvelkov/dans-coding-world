import { Router } from 'express';
import {
  postInjector,
  PostsService,
  CommentsService,
} from '@dans-coding-world/api-posts';
import { PostsController } from '../controllers/posts.controller';
import { CommentsController } from '../controllers/comments.controller';

const postsController = new PostsController(postInjector.get(PostsService));

const commentsController = new CommentsController(
  postInjector.get(CommentsService)
);

export const postsRouter = Router();

postsRouter.route('/').get(postsController.getAll).post(postsController.create);

postsRouter
  .route('/:postId/comments')
  .get(commentsController.getPostComments)
  .post(commentsController.create);

postsRouter
  .route('/:postId/comments/:id')
  .get(commentsController.getCommentReplies)
  .patch(commentsController.update)
  .delete(commentsController.delete);

postsRouter
  .route('/:id')
  .get(postsController.get)
  .patch(postsController.update)
  .delete(postsController.delete);

/**
 * @openapi
 * tags:
 *   name: Posts
 *   description: Endpoints regarding posts and comments made on posts
 */
