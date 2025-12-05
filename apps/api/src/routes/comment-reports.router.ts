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
 *       Roles required: ADMIN or MOD
 *
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
 *       Roles required: ADMIN or MOD
 *
 *       Get a report by its Id along with moderation history, reported comment and user.
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
 * /reports/comments:
 *   post:
 *     tags: [Reports]
 *     summary: Create a report on a given comment.
 *     description: |
 *       Create a PENDING report on comment.<br /> Must be logged in, otherwise returns UNAUTHORIZED error.<br />
 *       Users cannot report the same comment twice. Users cannot report their own comments. <br />
 *       If post is not PUBLISHED and the user posting the report on the comment is not the author of the post, MOD or ADMIN - returns FORBIDDEN error. <br />
 *
 *       **Authentication:**
 *       - If access_token is not valid in Set-Cookie header, return 401 UNAUTHORIZED error
 *       - If access_token is valid, user can report comments
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateReportDto'
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: '#/components/schemas/CreateReportDto'
 *     responses:
 *       201:
 *         description: Report created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreateCommentReportResponse'
 *       400:
 *         description: Bad Request - Invalid report data
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
 *         description: Forbidden - you do not have access to this action
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ForbiddenError'
 *       404:
 *         description: Not Found - comment does not exist
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
 * /reports/comments/{id}:
 *   patch:
 *     tags: [Reports]
 *     summary: Update a report's status.
 *     description: |
 *       Roles required: ADMIN or MOD
 *
 *       Update a report's status and optionally leave a note about what action was taken.
 *       Users cannot update a report made about themselves.
 *       The new report status must be different from the current one.
 *
 *       **Authentication:**
 *       - If access_token is not valid in Set-Cookie header, return 401 UNAUTHORIZED error
 *       - If access_token is valid and the user is MOD or ADMIN, he can update the report's status.
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Numeric ID of the report
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateReportDto'
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: '#/components/schemas/UpdateReportDto'
 *     responses:
 *       200:
 *         description: Report updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreateCommentReportResponse'
 *       400:
 *         description: Bad Request - Invalid query params | Invalid form body
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
 *         description: Forbidden - you do not have access rights
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
 * /reports/comments/{id}:
 *   delete:
 *     tags: [Reports]
 *     summary: Delete a report by Id.
 *     description: |
 *       Roles required: ADMIN
 *
 *       Delete a report and its related report history by report Id.
 *
 *       Returns 403 FORBIDDEN error if the user requesting it
 *       is not ADMIN.
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Numeric ID of the report
 *     responses:
 *       200:
 *         description: Report deleted successfully
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
 *     CreateReportDto:
 *       type: object
 *       required:
 *         - commentId
 *         - reason
 *       properties:
 *         commentId:
 *           type: number
 *           description: The reported comment Id
 *           min: 0
 *         reason:
 *           type: string
 *           minLength: 0,
 *           maxLength: 500
 *           description: The reason for reporting
 *       example:
 *         commentId: 1
 *         reason: Inappropriate comment
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
 *     UpdateReportDto:
 *       type: object
 *       required:
 *         - status
 *       properties:
 *         note:
 *           type: string
 *           description: Moderator note
 *           maxLength: 500
 *         status:
 *           type: string
 *           enum: [PENDING , REVIEWING , RESOLVED , DISMISSED]
 *           description: New report status. Must be different than the report's current one.
 *       example:
 *         status: REVIEWING
 *         note: Mod (mod123@email.com) is reviewing report
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
 *                 report:
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
 *     CreateCommentReportResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/SuccessResponse'
 *         - type: object
 *           properties:
 *             data:
 *               type: object
 *               properties:
 *                 report:
 *                   allOf:
 *                     - $ref: '#/components/schemas/Report'
 */
