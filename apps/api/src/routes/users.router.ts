import { Router } from 'express';
import { authInjector, TOKEN_SERVICE_TOKEN } from '@dans-coding-world/api-auth';
import { userInjector, UserService } from '@dans-coding-world/api-users';
import { UsersController } from '../controllers/users.controller';
import { upload } from '../middlewares/file-uploader.middleware';

const usersController = new UsersController(
  userInjector.get(UserService),
  authInjector.get(TOKEN_SERVICE_TOKEN)
);

const usersRouter = Router();
usersRouter.patch('/', [upload.single('avatar'), usersController.update]);
usersRouter.route('/password').patch(usersController.changePassword);
usersRouter
  .route('/:id')
  .get(usersController.get)
  .delete(usersController.delete);

usersRouter.route('/:id/role').patch(usersController.changeRole);
usersRouter.route('/:id/ban').patch(usersController.changeBanStatus);
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
 *     summary: Get user by Id
 *     description: |
 *       Retrieve a user by their ID, including profile details if the profile is set up. If the requesting user is the account owner, a Moderator, or an Admin, the response will also include the email field
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
 *     summary: Update the currently logged-in user's password
 *     description: |
 *       Update currently logged-in user's password if the provided old password matches the
 *       current one and the new password is valid
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
 * /users/{id}/ban:
 *   patch:
 *     tags: [Users]
 *     summary: Update ban status of an user
 *     description: |
 *       Roles required: ADMIN or MOD
 *
 *       Update another user's ban status by user Id.
 *       Cannot change the ban status of another administrator, moderator, or your own account.
 *
 *       **Banned users are not allowed certain user privileges and have no access to some parts of the API.**
 *
 *       **Authentication:**
 *       - If access_token is not valid in Set-Cookie header, return 401 UNAUTHORIZED error
 *       - If access_token is valid and user is ADMIN/MOD - he can change another user's ban status.
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Numeric ID of the user that will be banned/un-banned
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChangeBanStatusDto'
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: '#/components/schemas/ChangeBanStatusDto'
 *     responses:
 *       200:
 *         description: Ban status updated successfully
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
 *       403:
 *         description: Forbidden - Invalid ban status change
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
 * /users/{id}/role:
 *   patch:
 *     tags: [Users]
 *     summary: Update user's role
 *     description: |
 *       Roles required: ADMIN
 *
 *       Update another user's role by user Id.
 *       Cannot change role to ADMIN or change role of another ADMIN.
 *
 *       **Authentication:**
 *       - If access_token is not valid in Set-Cookie header, return 401 UNAUTHORIZED error
 *       - If access_token is valid and user is ADMIN - he can change another user's role.
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Numeric ID of the user that will have his role changed
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateRoleDto'
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: '#/components/schemas/UpdateRoleDto'
 *     responses:
 *       200:
 *         description: Role updated successfully
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
 *       403:
 *         description: Forbidden - Invalid role change
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
 * /users:
 *   patch:
 *     tags: [Users]
 *     summary: Update the currently logged-in user's profile
 *     description: |
 *       Updates the profile of the currently authenticated user. If profile details are not yet defined, they will be created.
 *
 *       **Authentication:**
 *       - If access_token is not valid in Set-Cookie header, return 401 UNAUTHORIZED error
 *       - If access_token is valid, he can update his own profile.
 *     requestBody:
 *       content:
 *        multipart/form-data:
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
 *       Retrieves all refresh tokens for a user by their ID and updates each token’s status to revoked, rendering them invalid.
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: integer
 *         required: true
 *         description: Numeric ID of the user
 *     responses:
 *       200:
 *         description: User's tokens revoked successfully
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
 *         description: Unauthorized - Login first
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 *       403:
 *         description: Forbidden - you do not have access to this action
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
 *     summary: Delete a user by Id
 *     description: |
 *
 *       Delete a user's account and all content that spans from it by user Id.
 *
 *       Returns 403 FORBIDDEN error if the user requesting it
 *       is not the owner of the account (**does not apply to admins**).
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
 *           type: integer
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
 *         isBanned:
 *           type: boolean
 *           description: Whether user is banned or not
 *           example: false
 *
 *     Profile:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
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
 *           example: 'Jon'
 *         lastName:
 *           type: string
 *           description: User last name
 *           minLength: 2
 *           maxLength: 90
 *           example: 'Doe'
 *         bio:
 *           type: string
 *           description: User's bio
 *           maxLength: 300
 *           example: 'This is my bio'
 *         avatar:
 *           type: string
 *           format: binary
 *           description: User's avatar file
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
 *         newPassword: coolNewPass1@3
 *
 *     UpdateRoleDto:
 *       type: object
 *       properties:
 *         role:
 *           type: string
 *           enum: [USER, MOD, AUTHOR]
 *           description: New role. Could be one of [USER, MOD, AUTHOR]
 *       example:
 *         role: USER
 *
 *     ChangeBanStatusDto:
 *       type: object
 *       properties:
 *         isBanned:
 *           type: boolean
 *           description: Whether user is banned or not.
 *       example:
 *         isBanned: true
 *
 */
