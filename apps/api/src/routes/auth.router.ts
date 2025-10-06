import { Router } from 'express';
import {
  authInjector,
  AuthService,
  RegistrationService,
  TOKEN_SERVICE_TOKEN,
} from '@dans-coding-world/api-auth';
import { AuthController } from '../controllers/auth.controller';

const authController = new AuthController(
  authInjector.get(AuthService),
  authInjector.get(RegistrationService),
  authInjector.get(TOKEN_SERVICE_TOKEN)
);

const authRouter = Router();

/**
 * @openapi
 * tags:
 *   name: Authentication
 *   description: Endpoints for user login, token generation, registration and access control
 */

// I don't understand the point of this but I hope its good practice.
// There is probably a better way using swagger decorators or something.

/**
 * @openapi
 * components:
 *   schemas:
 *     RefreshToken:
 *       type: object
 *       properties:
 *         jti:
 *           type: string
 *           description: Token Id in UUID format.
 *           example: '47ae3c2b-0753-4480-89d9-6cf2e2c8796d'
 *         userId:
 *           type: number
 *           description: The User Id
 *         revoked:
 *           type: boolean
 *           description: Indicates if the token is revoked or not
 *           example: false
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When the token was created.
 *         expiresAt:
 *           type: string
 *           format: date-time
 *           description: When the token will expire created.
 *
 *     BaseResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           description: Indicates if the request was successful
 *         data:
 *           type: object
 *           nullable: true
 *           description: The response data (null on error)
 *         error:
 *           type: object
 *           nullable: true
 *           description: Error details (null on success)
 *
 *     SuccessResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/BaseResponse'
 *       properties:
 *         success:
 *           example: true
 *         error:
 *           example: null
 *
 *     ErrorResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/BaseResponse'
 *       properties:
 *         success:
 *           example: false
 *         error:
 *           type: object
 *           properties:
 *             status:
 *               type: number
 *               description: HTTP status code
 *             errorCode:
 *               type: string
 *               description: Application-specific error code
 *             message:
 *               type: string
 *               description: Human-readable error message
 *             details:
 *               type: object
 *               description: Error details
 *
 *     LoginDTO:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           description: User's email
 *         password:
 *           type: string
 *           description: User's password
 *       example:
 *         email: user123@gmail.com
 *         password: my_password_123
 *
 *     RegistrationDTO:
 *       type: object
 *       required:
 *         - email
 *         - username
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User's email
 *         username:
 *           type: string
 *           description: User's username
 *           minLength: 8
 *           maxLength: 32
 *           pattern: '^[a-zA-z0-9_]+$'
 *         password:
 *           type: string
 *           format: password
 *           description: User's password
 *           minLength: 8
 *           maxLength: 32
 *       example:
 *         email: user_123@gmail.com
 *         username: username132
 *         password: Password_123
 *
 *     RefreshTokenDTO:
 *       type: object
 *       required:
 *         - token
 *       properties:
 *         token:
 *           type: string
 *           description: User's refresh token
 *       example:
 *         token: 03j1fj391i90vi90n10n39n1v...
 *
 *     LoginSuccessData:
 *       type: object
 *       properties:
 *         user:
 *           type: object
 *           description: User information
 *           properties:
 *             id:
 *               type: string
 *               description: User ID
 *             email:
 *               type: string
 *               description: User email
 *             username:
 *               type: string
 *               description: User name
 *             role:
 *               type: string
 *               description: User role
 *         message:
 *           type: string
 *           description: Login success message
 *       example:
 *         user:
 *           id: "12345"
 *           email: user123@gmail.com
 *           username: user123
 *           role: 'USER'
 *         message: 'Login successful'
 *
 *     LoginSuccessResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/SuccessResponse'
 *         - type: object
 *           properties:
 *             data:
 *               $ref: '#/components/schemas/LoginSuccessData'
 *
 *     WrongCredentialsError:
 *       allOf:
 *         - $ref: '#/components/schemas/ErrorResponse'
 *         - type: object
 *           properties:
 *             error:
 *               type: object
 *               properties:
 *                 status:
 *                   type: number
 *                   example: 401
 *                 errorCode:
 *                   type: string
 *                   example: AUTH001
 *                 message:
 *                   type: string
 *                   example: Provided credentials are invalid
 *
 *     WrongPasswordError:
 *       allOf:
 *         - $ref: '#/components/schemas/ErrorResponse'
 *         - type: object
 *           properties:
 *             error:
 *               type: object
 *               properties:
 *                 status:
 *                   type: number
 *                   example: 401
 *                 errorCode:
 *                   type: string
 *                   example: AUTH002
 *                 message:
 *                   type: string
 *                   example: Provided password is wrong
 *
 *     InvalidTokenError:
 *       allOf:
 *         - $ref: '#/components/schemas/ErrorResponse'
 *         - type: object
 *           properties:
 *             error:
 *               type: object
 *               properties:
 *                 status:
 *                   type: number
 *                   example: 401
 *                 errorCode:
 *                   type: string
 *                   example: AUTH003
 *                 message:
 *                   type: string
 *                   example: Invalid or expired token
 *
 *     UnauthorizedError:
 *       allOf:
 *         - $ref: '#/components/schemas/ErrorResponse'
 *         - type: object
 *           properties:
 *             error:
 *               type: object
 *               properties:
 *                 status:
 *                   type: number
 *                   example: 401
 *                 errorCode:
 *                   type: string
 *                   example: AUTH005
 *                 message:
 *                   type: string
 *                   example: You must be logged in to perform this action.
 * 
 *     ForbiddenError:
 *       allOf:
 *         - $ref: '#/components/schemas/ErrorResponse'
 *         - type: object
 *           properties:
 *             error:
 *               type: object
 *               properties:
 *                 status:
 *                   type: number
 *                   example: 403
 *                 errorCode:
 *                   type: string
 *                   example: SERV003
 *                 message:
 *                   type: string
 *                   example: You do not have permissions to perform this action.
 *
 *     InternalServerError:
 *       allOf:
 *         - $ref: '#/components/schemas/ErrorResponse'
 *         - type: object
 *           properties:
 *             error:
 *               type: object
 *               properties:
 *                 status:
 *                   type: number
 *                   example: 500
 *                 errorCode:
 *                   type: string
 *                   example: INTERNAL_SERVER_ERROR
 *                 message:
 *                   type: string
 *                   example: Something went wrong.
 *       example:
 *         success: false
 *         data: null
 *         error:
 *           status: 500
 *           errorCode: INTERNAL_SERVER_ERROR
 *           message: Something went wrong.
 */

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Login a user using their credentials
 *     description: Validates user credentials, then returns user data with access and refresh tokens set in "Set-Cookie" header.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginDTO'
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: '#/components/schemas/LoginDTO'
 *     responses:
 *       200:
 *         description: Login successful
 *         headers:
 *           Set-Cookie:
 *             description:
 *               Stores the access_token and refresh_token as HttpOnly cookies.
 *               These cookies are automatically included in subsequent requests and used by the server to authenticate the user.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginSuccessResponse'
 *       401:
 *         description: Unauthorized - Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/WrongCredentialsError'
 *                 - $ref: '#/components/schemas/WrongPasswordError'
 *       400:
 *         description: Bad Request - Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               data: null
 *               error:
 *                 status: 400
 *                 errorCode: VALIDATION_ERROR
 *                 message: Email and password are required
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InternalServerError'
 */
authRouter.post('/login', authController.login);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Authentication]
 *     summary: Logout the currently logged-in user
 *     description: Logs user out by revoking his refresh token and clearing 'set-cookie' header token values.
 *     responses:
 *       200:
 *         description: Logout successful
 *         headers:
 *           Set-Cookie:
 *             description:
 *               Removes the access_token and refresh_token cookies.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               error: null
 *               success: true
 *               data:
 *                 message: 'Logout successful'
 *       401:
 *         description: Unauthorized - Login first
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InternalServerError'
 */
authRouter.post('/logout', authController.logout);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags: [Authentication]
 *     summary: Refresh access and refresh tokens
 *     description: Validates provided refresh token, then returns user data with access and refresh tokens as cookies.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshTokenDTO'
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: '#/components/schemas/RefreshTokenDTO'
 *     responses:
 *       200:
 *         description: Token refresh successful
 *         headers:
 *           Set-Cookie:
 *             description:
 *               Stores the access_token and refresh_token as HttpOnly cookies.
 *               These cookies are automatically included in subsequent requests and used by the server to authenticate the user.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginSuccessResponse'
 *       401:
 *         description: Unauthorized - Invalid or expired refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InvalidTokenError'
 *       400:
 *         description: Bad Request - Missing refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               data: null
 *               error:
 *                 status: 400
 *                 errorCode: VALIDATION_ERROR
 *                 message: Refresh token is required
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InternalServerError'
 */
authRouter.post('/refresh', authController.refresh);

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Authentication]
 *     summary: Register a user.
 *     description: Validates signup data, then creates and returns the new user.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegistrationDTO'
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: '#/components/schemas/RegistrationDTO'
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginSuccessResponse'
 *       400:
 *         description: Bad Request - Validation Failed
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
 *                 message: Validation Failed
 *       409:
 *         description: Conflict - User already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               data: null
 *               error:
 *                 status: 409
 *                 errorCode: VAL002
 *                 message: User with this email or username already exists
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InternalServerError'
 */
authRouter.post('/register', authController.register);

/**
 * @openapi
 * /auth/revokeToken:
 *   post:
 *     tags: [Authentication]
 *     summary: End a user session by revoking the refresh token.
 *     description: Checks if valid JWT token is passed, then proceeds to set its status to 'revoked', making the token invalid.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshTokenDTO'
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: '#/components/schemas/RefreshTokenDTO'
 *     responses:
 *       200:
 *         description: Token revoked
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/RefreshToken'
 *       400:
 *         description: Bad Request - Validation Failed
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
 *                 message: Validation Failed
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
 *       404:
 *         description: Not Found - Token no longer exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               data: null
 *               error:
 *                 status: 404
 *                 errorCode: AUTH004
 *                 message: Token no longer exists
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InternalServerError'
 */
authRouter.post('/revokeToken', authController.revokeToken);

/**
 * @openapi
 * /auth/revokeAll:
 *   post:
 *     tags: [Authentication]
 *     summary: End all user session by revoking all refresh tokens
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
authRouter.post('/revokeAll', authController.revokeAllTokens);
export default authRouter;
