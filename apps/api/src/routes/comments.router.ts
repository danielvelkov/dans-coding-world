import { Router } from 'express';
import { postInjector, CommentsService } from '@dans-coding-world/api-posts';
import { CommentsController } from '../controllers/comments.controller';

const commentsController = new CommentsController(
  postInjector.get(CommentsService)
);

// mergeParams so that it includes postId from parent route
const commentsRouter = Router({ mergeParams: true });

commentsRouter
  .route('/')
  .get(commentsController.getPostComments)
  .post(commentsController.create);

commentsRouter
  .route('/:id')
  .get(commentsController.get)
  .patch(commentsController.update)
  .delete(commentsController.delete);

export default commentsRouter;

/**
 * @openapi
 * tags:
 *   name: Comments
 *   description: Endpoints regarding posts' comments
 */

/**
 * @openapi
 * /posts/{postId}/comments:
 *   get:
 *     tags: [Comments]
 *     summary: Get post comments with pagination metadata
 *     description: |
 *       Get a specific post's top-level comments by post id. Each comment comes with its replies. Provides pagination and sorting only on the top-level comments.
 *       <br/> Returns a 403 FORBIDDEN error, If post is private and the user requesting it
 *       is not the author (***does not apply to admins or moderators***).
 *
 *       **Authentication:**
 *       - If access_token is not valid in Set-Cookie header, MEMBERS_ONLY posts return 401 UNAUTHORIZED error
 *       - If access_token is valid, user's private posts' comments can be queried
 *     parameters:
 *       - in: path
 *         name: postId
 *         schema:
 *           type: integer
 *         required: true
 *         description: Numeric ID of the post
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
 *         name: sortBy[updatedAt]
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         required: false
 *         description: Sort by modification date
 *       - in: query
 *         name: depth
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 3
 *         required: false
 *         description: Controls how deeply nested replies are included in the response. If not specified, all replies are retrieved.
 *     responses:
 *       200:
 *         description: Comments retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GetPostCommentsResponse'
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
 *         description: Unauthorized - Login first (members_only post)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 *       403:
 *         description: Forbidden - you do not have access to this post
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ForbiddenError'
 *       404:
 *         description: Not Found - Post does not exist
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
 * /posts/{postId}/comments/{id}:
 *   get:
 *     tags: [Comments]
 *     summary: Get comment and its replies
 *     description: |
 *       Get a specific comment by its Id along with its direct replies if any.
 *       <br/>Returns 403 FORBIDDEN error, If the post this comment belongs to is private and the user requesting it
 *       is not the author (***does not apply to admins or moderators***).
 *
 *       **Authentication:**
 *       - If access_token is not valid in Set-Cookie header, comments on MEMBERS_ONLY posts return 403 FORBIDDEN error
 *       - If access_token is valid, user's private posts' comments can be queried
 *     parameters:
 *       - in: path
 *         name: postId
 *         schema:
 *           type: integer
 *         required: true
 *         description: Numeric ID of the post
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Numeric ID of the comment
 *       - in: query
 *         name: depth
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 3
 *         required: false
 *         description: Controls how deeply nested replies are included in the response. If not specified, all replies are retrieved.
 *     responses:
 *       200:
 *         description: Comment and replies retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GetCommentRepliesResponse'
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
 *         description: Unauthorized - Login first (members_only post)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 *       403:
 *         description: Forbidden - you do not have access to this post
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ForbiddenError'
 *       404:
 *         description: Not Found - Post/Comment does not exist
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
 * /posts/{postId}/comments:
 *   post:
 *     tags: [Comments]
 *     summary: Create a comment or reply
 *     description: |
 *       Create a comment on a post or a reply to a comment.<br /> Must be logged in, otherwise returns UNAUTHORIZED error.<br />
 *       If post is not PUBLISHED and the user posting the comment is not the author - returns FORBIDDEN error. <br />
 *
 *       **Authentication:**
 *       - If access_token is not valid in Set-Cookie header, return 401 UNAUTHORIZED error
 *       - If access_token is valid, user can comment on PUBLISHED posts
 *     parameters:
 *       - in: path
 *         name: postId
 *         schema:
 *           type: integer
 *         required: true
 *         description: Numeric ID of the post
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCommentDto'
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: '#/components/schemas/CreateCommentDto'
 *     responses:
 *       201:
 *         description: Comment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CommentResponse'
 *       400:
 *         description: Bad Request - Invalid post data
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
 *         description: Not Found - Post/Reply does not exist
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
 * /posts/{postId}/comments/{id}:
 *   patch:
 *     tags: [Comments]
 *     summary: Update a comment content by Id
 *     description: |
 *       Update a comment's 'content' field. <br/>
 *       Returns FORBIDDEN error, If post is DRAFT or ARCHIVED and the user requesting it
 *       is not the author (***does not apply to admins or moderators***).
 *
 *       **Authentication:**
 *       - If access_token is not valid in Set-Cookie header, return 401 UNAUTHORIZED error
 *       - If access_token is valid, user can update his comments on PUBLISHED posts
 *     parameters:
 *       - in: path
 *         name: postId
 *         schema:
 *           type: integer
 *         required: true
 *         description: Numeric ID of the post
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Numeric ID of the comment
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateCommentDto'
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: '#/components/schemas/UpdateCommentDto'
 *     responses:
 *       200:
 *         description: Comment updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CommentResponse'
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
 *         description: Forbidden - you do not have access rights to edit comment
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ForbiddenError'
 *       404:
 *         description: Not Found - Post/Comment does not exist
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
 * /posts/{postId}/comments/{id}:
 *   delete:
 *     tags: [Comments]
 *     summary: Delete a comment by Id
 *     description: |
 *       Delete a comment on a post. Returns FORBIDDEN error, If the user requesting it
 *       is not the author (***does not apply to admins or moderators***).
 *
 *       **Authentication:**
 *       - If access_token is not valid in Set-Cookie header, return 401 UNAUTHORIZED error
 *       - If access_token is valid, user can delete his comments on PUBLISHED posts
 *     parameters:
 *       - in: path
 *         name: postId
 *         schema:
 *           type: integer
 *         required: true
 *         description: Numeric ID of the post
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Numeric ID of the comment
 *     responses:
 *       200:
 *         description: Comment deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CommentResponse'
 *       400:
 *         description: Bad Request - Invalid params
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
 *         description: Forbidden - you do not have access rights to delete this comment
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ForbiddenError'
 *       404:
 *         description: Not Found - Post/Comment does not exist
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
 *     Comment:
 *       type: object
 *       properties:
 *         id:
 *           type: number
 *           description: Comment Id.
 *           example: 1
 *         postId:
 *           type: number
 *           description: The Post where the comment is
 *           example: 1
 *         userId:
 *           type: number
 *           description: The User Id
 *           example: 1
 *         threadParentId:
 *           type: number
 *           nullable: true
 *           description: >
 *             The ID of the parent comment if this is a reply.
 *             Null for top-level comments.
 *           example: null
 *         content:
 *           type: string
 *           description: Comment content
 *           minLength: 1
 *           maxLength: 1024
 *           example: Here is an example comment
 *         depth:
 *           type: number
 *           description: >
 *             The nesting level of the comment.
 *             0 = top-level comment,
 *             1+ = reply depth.
 *           minimum: 0
 *           example: 5
 *         replyCount:
 *           type: number
 *           description: Direct reply count. Direct means 1 depth level below comment.
 *           example: 0
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When the comment was posted.
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: When the comment was last modified.
 *         replies:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Comment'
 *           description: Comment replies (if any).
 *           example: []
 *
 *     CreateCommentDto:
 *       type: object
 *       required:
 *         - content
 *       properties:
 *         content:
 *           type: string
 *           description: Post content
 *           minLength: 1
 *           maxLength: 1024
 *         replyToCommentId:
 *           type: number
 *           description: Comment to which this comment reply might be
 *       example:
 *         content: Some random content.
 *         replyToCommentId: 1
 *
 *     UpdateCommentDto:
 *       type: object
 *       required:
 *         - content
 *       properties:
 *         content:
 *           type: string
 *           description: Post content
 *           minLength: 1
 *           maxLength: 1024
 *       example:
 *         content: Updated new random content.
 *
 *     GetPostCommentsResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/SuccessResponse'
 *         - type: object
 *           properties:
 *             data:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Comments retrieved successfully
 *                 items:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Comment'
 *                 count:
 *                   type: number
 *                   description: Number of items in current response
 *                   example: 0
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationMetadata'
 *
 *     GetCommentRepliesResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/SuccessResponse'
 *         - type: object
 *           properties:
 *             data:
 *               type: object
 *               properties:
 *                 comment:
 *                   $ref: '#/components/schemas/Comment'
 *                 replyCount:
 *                   type: number
 *                   description: Total count of direct replies
 *                   example: 0
 *
 *     CommentResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/SuccessResponse'
 *         - type: object
 *           properties:
 *             data:
 *               type: object
 *               properties:
 *                 comment:
 *                   $ref: '#/components/schemas/Comment'
 */
