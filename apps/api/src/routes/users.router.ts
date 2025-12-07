import { Router } from 'express';
import { authInjector, TOKEN_SERVICE_TOKEN } from '@dans-coding-world/api-auth';
import { UsersController } from '../controllers/users.controller';

const usersController = new UsersController(
  authInjector.get(TOKEN_SERVICE_TOKEN)
);

const usersRouter = Router();
usersRouter.post('/:id/revoke-tokens', usersController.revokeUserTokens);

export default usersRouter;

/**
 * @openapi
 * tags:
 *   name: Users
 *   description: Endpoints regarding users
 */

/**
 * @openapi
 * /users/{userId}/revoke-tokens:
 *   post:
 *     tags: [Users]
 *     summary: Revoke all user refresh tokens
 *     description: |
 *       Roles required: ADMIN or MOD
 *
 *       Gets all refresh tokens for an user given his id, then sets the token status to 'revoked', making each one invalid.
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

/**
 * @openapi
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: User ID
 *           example: 1
 *         email:
 *           type: string
 *           description: User email
 *           example: user123@email.com
 *         username:
 *           type: string
 *           description: User name
 *           example: user123
 *         role:
 *           type: string
 *           description: User role. Can be either ADMIN, MOD, AUTHOR or USER
 *           example: USER
 */
