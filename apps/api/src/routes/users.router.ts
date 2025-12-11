import { Router } from 'express';
import { authInjector, TOKEN_SERVICE_TOKEN } from '@dans-coding-world/api-auth';
import { userInjector, UserService } from '@dans-coding-world/api-users';
import { UsersController } from '../controllers/users.controller';

const usersController = new UsersController(
  userInjector.get(UserService),
  authInjector.get(TOKEN_SERVICE_TOKEN)
);

const usersRouter = Router();
usersRouter.patch('/', usersController.update);
usersRouter
  .route('/:id')
  .get(usersController.get)
  .delete(usersController.delete);

usersRouter.route('/password').patch(usersController.changePassword);

usersRouter.route('/:id/role').patch(usersController.changeRole);
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
 * /users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get user by Id.
 *     description: |
 *       Get a specific user by its Id along with its profile details if he has his profile set up.
 *       If the user requesting it is the owner of the account, Moderator or Admin - the "email" field is included in the response
 *
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Numeric ID of the user
 *     responses:
 *       200:
 *         description: User details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GetUserResponse'
 *       400:
 *         description: Bad Request - Invalid query params
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               data: null
 *               error:
 *                 status: 400
 *                 errorCode: VAL001
 *                 message: One or more fields failed validation
 *       404:
 *         description: Not Found - User does not exist
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               data: null
 *               error:
 *                 status: 404
 *                 errorCode: SER002
 *                 message: Resource not found
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InternalServerError'
 */

/**
 * @openapi
 * /users/password:
 *   patch:
 *     tags: [Users]
 *     summary: Update user's password.
 *     description: |
 *       Update logged-in user's password if the provided old password matches the
 *       current one and the new password is valid. Requires user to be logged in.
 *
 *       **Authentication:**
 *       - If access_token is not valid in Set-Cookie header, return 401 UNAUTHORIZED error
 *       - If access_token is valid, user can change his password.
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdatePasswordDto'
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: '#/components/schemas/UpdatePasswordDto'
 *     responses:
 *       200:
 *         description: Password updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GetUserResponse'
 *       400:
 *         description: Bad Request - Invalid form body
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               data: null
 *               error:
 *                 status: 400
 *                 errorCode: VAL001
 *                 message: One or more fields failed validation
 *       401:
 *         description: Unauthorized - Login first
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 *       404:
 *         description: Not Found - User does not exist
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               data: null
 *               error:
 *                 status: 404
 *                 errorCode: SER002
 *                 message: Resource not found
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InternalServerError'
 */

/**
 * @openapi
 * /users:
 *   patch:
 *     tags: [Users]
 *     summary: Update user's profile details.
 *     description: |
 *       Update or create profile details if they are not defined. Requires user to be logged in.
 *
 *       **Authentication:**
 *       - If access_token is not valid in Set-Cookie header, return 401 UNAUTHORIZED error
 *       - If access_token is valid, he can update his own profile.
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProfileDto'
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProfileDto'
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GetUserResponse'
 *       400:
 *         description: Bad Request - Invalid form body
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               data: null
 *               error:
 *                 status: 400
 *                 errorCode: VAL001
 *                 message: One or more fields failed validation
 *       401:
 *         description: Unauthorized - Login first
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 *       404:
 *         description: Not Found - User does not exist
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               data: null
 *               error:
 *                 status: 404
 *                 errorCode: SER002
 *                 message: Resource not found
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InternalServerError'
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
 * /users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Delete a user by Id.
 *     description: |
 *
 *       Delete a user's account and all content that spans from it by user Id.
 *
 *       Returns 403 FORBIDDEN error if the user requesting it
 *       is not the author (**does not apply to admins**).
 *
 *       **Admins CANNOT delete themselves or other admins!*
 *
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Numeric ID of the user
 *     responses:
 *       200:
 *         description: User deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Bad Request - Invalid query params
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               data: null
 *               error:
 *                 status: 400
 *                 errorCode: VAL001
 *                 message: One or more fields failed validation
 *       403:
 *         description: Forbidden - invalid deletion attempt
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ForbiddenError'
 *       404:
 *         description: Not Found - User does not exist
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               data: null
 *               error:
 *                 status: 404
 *                 errorCode: SER002
 *                 message: Resource not found
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
 *
 *     Profile:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Profile ID
 *           example: 1
 *         firstName:
 *           type: string
 *           description: User first name
 *           example: John
 *         lastName:
 *           type: string
 *           description: User last name
 *           example: Doe
 *         bio:
 *           type: string
 *           description: User bio
 *           example: Very mysterious person
 *         avatarUrl:
 *           type: string
 *           description: Url to avatar picture
 *           example: some.cloud.storage/images/id
 *
 *     GetUserResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/SuccessResponse'
 *         - type: object
 *           properties:
 *             data:
 *               type: object
 *               properties:
 *                 user:
 *                   allOf:
 *                     - $ref: '#/components/schemas/User'
 *                     - type: object
 *                       properties:
 *                         profile:
 *                           $ref: '#/components/schemas/Profile'
 *
 *     UpdateProfileDto:
 *       type: object
 *       properties:
 *         firstName:
 *           type: string
 *           description: User first name
 *           minLength: 2
 *           maxLength: 50
 *         lastName:
 *           type: string
 *           description: User last name
 *           minLength: 2
 *           maxLength: 90
 *         bio:
 *           type: string
 *           description: User's bio
 *           maxLength: 300
 *         avatarUrl:
 *           type: string
 *           description: User's avatar url
 *       example:
 *         firstName: Jon.
 *         lastName: Doe
 *
 *     UpdatePasswordDto:
 *       type: object
 *       properties:
 *         oldPassword:
 *           type: string
 *           description: User's old password
 *           minLength: 8
 *           maxLength: 32
 *         newPassword:
 *           type: string
 *           description: User's new password
 *           minLength: 8
 *           maxLength: 32
 *       example:
 *         oldPassword: badPassword1.
 *         newPassword: dkjafdld_skfj!al
 *
 */
