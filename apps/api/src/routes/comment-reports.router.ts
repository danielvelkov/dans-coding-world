import { Router } from 'express';
import {
  commentReportInjector,
  CommentReportsService,
} from '@dans-coding-world/api-reports';
import { CommentReportsController } from '../controllers/reports/comment-reports.controller';

const commentReportsController = new CommentReportsController(
  commentReportInjector.get(CommentReportsService)
);

const commentReportsRouter = Router();

commentReportsRouter
  .route('/')
  .get(commentReportsController.getAll)
  .post(commentReportsController.create);

commentReportsRouter
  .route('/:id')
  .get(commentReportsController.get)
  .patch(commentReportsController.updateStatus)
  .delete(commentReportsController.delete);

export default commentReportsRouter;

/**
 * @openapi
 * tags:
 *   name: Reports
 *   description: Endpoints regarding reports made about comments
 */

/**
 * @openapi
 * /reports/comments:
 *   get:
 *     tags: [Reports]
 *     summary: Get reports made on comments with pagination metadata.
 *     description: |
 *       Get all user reports regarding comments. Each report comes with the comment in question. Provides pagination and sorting.
 *
 *       **Authentication:**
 *       - If access_token is not valid in Set-Cookie header, returns 401 UNAUTHORIZED error
 *       - If access_token is valid, and user is ADMIN or MOD reports can be queried
 *     parameters:
 *       - in: query
 *         name: pageOffset
 *         schema:
 *           type: integer
 *           minimum: 0
 *         required: false
 *         description: Page offset for pagination (must be divisible by pageSize)
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           minimum: 0
 *           enum: [10, 25, 50]
 *           default: 10
 *         required: false
 *         description: Number of items per page
 *       - in: query
 *         name: sortBy[createdAt]
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         required: false
 *         description: Sort by creation date
 *       - in: query
 *         name: filterBy[status]
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             enum: [PENDING , REVIEWING , RESOLVED , DISMISSED]
 *         style: form
 *         explode: true
 *         required: false
 *         description: Filter by report status (can specify multiple)
 *       - in: query
 *         name: filterBy[maliciousUserId]
 *         schema:
 *           type: integer
 *           minimum: 0
 *         required: false
 *         description: Filter by reported userId
 *       - in: query
 *         name: filterBy[postId]
 *         schema:
 *           type: integer
 *           minimum: 0
 *         required: false
 *         description: Filter by specific postId
 *     responses:
 *       200:
 *         description: Reports retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GetCommentReportsResponse'
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
 *       401:
 *         description: Unauthorized - Login first
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
 * /reports/comments/{id}:
 *   get:
 *     tags: [Reports]
 *     summary: Get report by id.
 *     description: |
 *       Get a report by its Id along with reported comment and user, alongside report history.
 *
 *       **Authentication:**
 *       - If access_token is not valid in Set-Cookie header, returns 401 UNAUTHORIZED error
 *       - If access_token is valid, and user is ADMIN or MOD report can be queried
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Numeric ID of the report
 *     responses:
 *       200:
 *         description: Report details queried successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GetCommentReportResponse'
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
 *       401:
 *         description: Unauthorized - Login first
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 *       403:
 *         description: Forbidden - you do not have access
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ForbiddenError'
 *       404:
 *         description: Not Found - Report does not exist
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
 *     Report:
 *       type: object
 *       properties:
 *         id:
 *           type: number
 *           description: The report Id.
 *           example: 1
 *         commentId:
 *           type: number
 *           description: The reported comment Id
 *           example: 1
 *         reporterId:
 *           type: number
 *           description: The User Id of the person who reported the comment
 *           example: 1
 *         reason:
 *           type: string
 *           description: The reason for the report
 *           example: Inappropriate
 *         status:
 *           type: string
 *           description: The report status. Could be PENDING, REVIEWING, RESOLVED or DISMISSED
 *           example: PENDING
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When the report was created.
 *
 *     ReportHistory:
 *       type: object
 *       properties:
 *         id:
 *           type: number
 *           description: The report history Id.
 *           example: 1
 *         reportId:
 *           type: number
 *           description: The report Id this history belongs to
 *           example: 1
 *         moderatorId:
 *           type: number
 *           description: The User Id of the person added to the report history
 *           example: 1
 *         note:
 *           type: string
 *           description: The moderator note about the report status change
 *           example: User #ModUser123 is handling the report
 *         previousStatus:
 *           type: string
 *           description: The previous report status. Could be PENDING, REVIEWING, RESOLVED or DISMISSED
 *           example: PENDING
 *         newStatus:
 *           type: string
 *           description: The new report status. Could be PENDING, REVIEWING, RESOLVED or DISMISSED
 *           example: REVIEWING
 *         changedAt:
 *           type: string
 *           format: date-time
 *           description: When the history change occurred.
 *
 *     GetCommentReportsResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/SuccessResponse'
 *         - type: object
 *           properties:
 *             data:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Reports retrieved successfully
 *                 items:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/Report'
 *                       - type: object
 *                         properties:
 *                           reportedComment:
 *                             $ref: '#/components/schemas/Comment'
 *                 count:
 *                   type: number
 *                   description: Number of items in current response
 *                   example: 0
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationMetadata'
 *
 *     GetCommentReportResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/SuccessResponse'
 *         - type: object
 *           properties:
 *             data:
 *               type: object
 *               properties:
 *                 post:
 *                   allOf:
 *                     - $ref: '#/components/schemas/Report'
 *                     - type: object
 *                       properties:
 *                         history:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/ReportHistory'
 *                         reportedComment:
 *                           allOf:
 *                             - $ref: '#/components/schemas/Comment'
 *                             - type: object
 *                               properties:
 *                                 user:
 *                                   $ref: '#/components/schemas/User'
 *                         reportedBy:
 *                           $ref: '#/components/schemas/User'
 *
 */
