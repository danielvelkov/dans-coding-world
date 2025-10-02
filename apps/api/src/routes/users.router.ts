import { Router } from 'express';
import { authInjector, TOKEN_SERVICE_TOKEN } from '@dans-coding-world/api-auth';
import { UsersController } from '../controllers/users.controller';

const usersController = new UsersController(
  authInjector.get(TOKEN_SERVICE_TOKEN)
);

export const usersRouter = Router();

/**
 * @openapi
 * tags:
 *   name: Users
 *   description: Endpoints regarding users
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
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InternalServerError'
 */
usersRouter.post('/:id/revokeUserTokens', usersController.revokeUserTokens);
