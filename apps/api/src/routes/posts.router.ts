import { Router } from 'express';
import // postsInjector,
// POST_SERVICE_TOKEN,
// COMMENT_SERVICE_TOKEN,
'@dans-coding-world/api-posts';
import { PostsController } from '../controllers/posts.controller';

// const postsController = new PostsController(
//   postsInjector.get(POST_SERVICE_TOKEN),
//   postsInjector.get(COMMENT_SERVICE_TOKEN)
// );

export const postsRouter = Router();

// postsRouter.get('/', postsController.getAll);
// postsRouter
//   .route('/:id')
//   .get(postsController.get)
//   .post(postsController.create)
//   .patch(postsController.update)
//   .delete(postsController.delete);

/**
 * @openapi
 * tags:
 *   name: Posts
 *   description: Endpoints regarding posts
 */
