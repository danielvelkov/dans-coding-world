import { Router } from 'express';
import { authInjector, AuthService } from '@dans-coding-world/api-auth';
import { AuthController } from '../controllers/auth.controller';

const authController = new AuthController(authInjector.get(AuthService));

const authRouter = Router();

/**
 * @openapi
 * tags:
 *   name: Authentication
 *   description: Endpoints for user login, token generation, and access control
 */

/**
 * @openapi
 * components:
 *   schemas:
 *     BaseSuccessResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           description: Indicates if the request was successful
 *           example: true
 *         data:
 *           type: object
 *           description: The response data (null on error)
 *         error:
 *           type: object
 *           nullable: true
 *           description: Error details (null on success)
 *           example: null
 *
 *     BaseErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           description: Indicates if the request was successful
 *           example: false
 *         data:
 *           type: object
 *           nullable: true
 *           description: The response data (null on error)
 *           example: null
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
 *         accessToken:
 *           type: string
 *           description: The signed short-term JWT access token
 *         refreshToken:
 *           type: string
 *           description: The signed long-term JWT refresh token
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
 *       example:
 *         accessToken: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.KMUFsIDTnFmyG3nMiGM6H9FNFUROf3wh7SmqJp-QV30
 *         refreshToken: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.KMUFsIDTnFmyG3nMiGM6H9FNFUROf3wh7SmqJp-QV30
 *         user:
 *           id: "12345"
 *           email: user123@gmail.com
 *           name: John Doe
 *
 *     LoginSuccessResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/BaseSuccessResponse'
 *         - type: object
 *           properties:
 *             data:
 *               $ref: '#/components/schemas/LoginSuccessData'
 *       example:
 *         success: true
 *         data:
 *           accessToken: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.KMUFsIDTnFmyG3nMiGM6H9FNFUROf3wh7SmqJp-QV30
 *           refreshToken: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.KMUFsIDTnFmyG3nMiGM6H9FNFUROf3wh7SmqJp-QV30
 *           user:
 *             id: "12345"
 *             email: user123@gmail.com
 *             username: user123
 *             role: USER
 *         error: null
 *
 *     WrongCredentialsError:
 *       allOf:
 *         - $ref: '#/components/schemas/BaseErrorResponse'
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
 *       example:
 *         success: false
 *         data: null
 *         error:
 *           status: 401
 *           errorCode: AUTH001
 *           message: Provided credentials are invalid
 *
 *     WrongPasswordError:
 *       allOf:
 *         - $ref: '#/components/schemas/BaseErrorResponse'
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
 *       example:
 *         success: false
 *         data: null
 *         error:
 *           status: 401
 *           errorCode: AUTH002
 *           message: Provided password is wrong
 *
 *     InvalidTokenError:
 *       allOf:
 *         - $ref: '#/components/schemas/BaseErrorResponse'
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
 *       example:
 *         success: false
 *         data: null
 *         error:
 *           status: 401
 *           errorCode: AUTH003
 *           message: Invalid or expired token
 *
 *     InternalServerError:
 *       allOf:
 *         - $ref: '#/components/schemas/BaseErrorResponse'
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
 *     description: Validates user credentials and returns access and refresh tokens if successful
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
 *               $ref: '#/components/schemas/BaseErrorResponse'
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
 * /auth/refresh:
 *   post:
 *     tags: [Authentication]
 *     summary: Refresh access and refresh tokens
 *     description: Generate new access and refresh tokens using a valid refresh token
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
 *               $ref: '#/components/schemas/BaseErrorResponse'
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

export default authRouter;
