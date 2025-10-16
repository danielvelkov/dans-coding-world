import { Router } from 'express';
import {
  postsInjector,
  POST_SERVICE_TOKEN,
  COMMENT_SERVICE_TOKEN,
} from '@dans-coding-world/api-posts';
import { PostsController } from '../controllers/posts.controller';

const postsController = new PostsController(
  postsInjector.get(POST_SERVICE_TOKEN),
  postsInjector.get(COMMENT_SERVICE_TOKEN)
);

export const postsRouter = Router();

postsRouter.get('/', postsController.getAll);
postsRouter
  .route('/:id')
  .get(postsController.get)
  .post(postsController.create)
  .patch(postsController.update)
  .delete(postsController.delete);

/**
 * @openapi
 * tags:
 *   name: Posts
 *   description: Endpoints regarding posts
 */

/**
 * @openapi
 * /users/{userId}/revokeUserTokens:
 *   post:
 *     tags: [Users]
 *     summary: Revoke all user refresh tokens
 *     description: Gets all refresh tokens for an user given his id, then sets the token status to 'revoked', making each onec invalid.
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: integer
 *         required: true
 *         description: Numeric ID of the user
 *     responses:
 *       200:
 *         description: Tokens revoked
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                           revokedCount:
 *                             type: number
 *                             description: Number of revoked tokens
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ForbiddenError'
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InternalServerError'
 */
// usersRouter.post('/:id/revokeUserTokens', usersController.revokeUserTokens);
