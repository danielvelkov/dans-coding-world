import { Router } from 'express';
import { login } from '../controllers/auth.controller.js';

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
 *     WrongCredentialsError:
 *       type: object
 *       properties:
 *         errorCode:
 *           type: string
 *           description: Error code
 *           example: AUTH001
 *         message:
 *           type: string
 *           description: Error description
 *           example: Provided Credentials are invalid
 *         status:
 *           type: number
 *           description: Error HTTP status code
 *           example: 401
 *     WrongPasswordError:
 *       type: object
 *       properties:
 *         errorCode:
 *           type: string
 *           description: Error code
 *           example: AUTH002
 *         message:
 *           type: string
 *           description: Error description
 *           example: Provided password is wrong
 *         status:
 *           type: number
 *           description: Error HTTP status code
 *           example: 401
 */

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Login a user, using his/her credentials.
 *     description: Checks against provided user credentials and if valid, generates an access token.
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: '#/components/schemas/LoginDTO'
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message
 *                 token:
 *                   type: string
 *                   description: The signed JWT access token
 *               example:
 *                 message: Login successful
 *                 token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.KMUFsIDTnFmyG3nMiGM6H9FNFUROf3wh7SmqJp-QV30
 *       401:
 *         description: Unauthorized - wrong credentials
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/WrongCredentialsError'
 *                 - $ref: '#/components/schemas/WrongPasswordError'
 */
authRouter.post('/login', login);

export default authRouter;
