import { Router } from 'express';
import { postInjector, PostsService } from '@dans-coding-world/api-posts';
import { PostsController } from '../controllers/posts.controller';

const postsController = new PostsController(postInjector.get(PostsService));

const postsRouter = Router();

postsRouter.route('/').get(postsController.getAll).post(postsController.create);

postsRouter
  .route('/:id')
  .get(postsController.get)
  .patch(postsController.update)
  .delete(postsController.delete);

export default postsRouter;

/**
 * @openapi
 * tags:
 *   name: Posts
 *   description: Endpoints regarding posts
 */

/**
 * @openapi
 * /posts/{postId}:
 *   get:
 *     tags: [Posts]
 *     summary: Get a single post by Id.
 *     description: |
 *       Get a specific post by its Id. Returns a FORBIDDEN error, If post is private and the user requesting it
 *       is not the author.
 *
 *       **Authentication:**
 *       - If access_token is not valid in Set-Cookie header, MEMBERS_ONLY posts have their content masked
 *       - If access_token is valid, user's private posts that are DRAFT or ARCHIVED can be queried
 *     parameters:
 *       - in: path
 *         name: postId
 *         schema:
 *           type: integer
 *         required: true
 *         description: Numeric ID of the post
 *     responses:
 *       200:
 *         description: Post retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GetPostResponse'
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
 * /posts:
 *   get:
 *     tags: [Posts]
 *     summary: Get posts with pagination metadata.
 *     description: |
 *       Get posts with pagination, sorting, filtering, and search capabilities.
 *
 *       **Default behavior:**
 *       - Queries posts with status PUBLISHED
 *       - Includes visibility: PUBLIC and MEMBERS_ONLY
 *       - Sorted by creation date in descending order
 *
 *       **Authentication:**
 *       - If access_token is not valid in Set-Cookie header, MEMBERS_ONLY posts have their content masked
 *       - If access_token is valid, search query also applies to user's private posts that are DRAFT or ARCHIVED if no filters are set
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
 *           enum: [5, 10 ,25]
 *         required: false
 *         description: Number of items per page
 *       - in: query
 *         name: sortBy[createdAt]
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         required: false
 *         description: Sort by creation date
 *       - in: query
 *         name: sortBy[publishedAt]
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         required: false
 *         description: Sort by publication date
 *       - in: query
 *         name: sortBy[updatedAt]
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         required: false
 *         description: Sort by last update date
 *       - in: query
 *         name: filterBy[status]
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             enum: [DRAFT, PUBLISHED, ARCHIVED]
 *         style: form
 *         explode: true
 *         required: false
 *         description: Filter by post status (can specify multiple)
 *       - in: query
 *         name: filterBy[visibility]
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             enum: [PUBLIC, MEMBERS_ONLY]
 *         style: form
 *         explode: true
 *         required: false
 *         description: Filter by post visibility (can specify multiple)
 *       - in: query
 *         name: searchQuery
 *         schema:
 *           type: string
 *           maxLength: 255
 *         required: false
 *         description: Search query to filter posts by title
 *     responses:
 *       200:
 *         description: Posts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GetPostsResponse'
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
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InternalServerError'
 */

/**
 * @openapi
 * /posts:
 *   post:
 *     tags: [Posts]
 *     summary: Create a post.
 *     description: |
 *       Create a blog post.<br /> Must be logged in, otherwise returns UNAUTHORIZED error.<br />
 *       Admin-only operation.  If user creating the post is not admin returns FORBIDDEN error. <br />
 *       Posts that are created with 'isDraft' set to FALSE, have their publishedDate set
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePostDto'
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: '#/components/schemas/CreatePostDto'
 *     responses:
 *       201:
 *         description: Post created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GetPostResponse'
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
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InternalServerError'
 */

/**
 * @openapi
 * /posts/{postId}:
 *   patch:
 *     tags: [Posts]
 *     summary: Update a post by Id.
 *     description: |
 *       Update a post's field. Returns FORBIDDEN error, If post is DRAFT or ARCHIVED and the user requesting it
 *       is not the author.
 *     parameters:
 *       - in: path
 *         name: postId
 *         schema:
 *           type: integer
 *         required: true
 *         description: Numeric ID of the post
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdatePostDto'
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: '#/components/schemas/UpdatePostDto'
 *     responses:
 *       200:
 *         description: Post updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GetPostResponse'
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
 * /posts/{postId}:
 *   delete:
 *     tags: [Posts]
 *     summary: Delete a post by Id.
 *     description: |
 *       Delete a blog post. Returns FORBIDDEN error, If the user requesting it
 *       is not the author.
 *     parameters:
 *       - in: path
 *         name: postId
 *         schema:
 *           type: integer
 *         required: true
 *         description: Numeric ID of the post
 *     responses:
 *       200:
 *         description: Post deleted successfully
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
 * components:
 *   schemas:
 *     Post:
 *       type: object
 *       properties:
 *         id:
 *           type: number
 *           description: Post Id.
 *           example: 1
 *         authorId:
 *           type: number
 *           description: The User Id
 *           example: 1
 *         status:
 *           type: string
 *           description: The post status. Could be DRAFT, PUBLISHED or ARCHIVED
 *           example: DRAFT
 *         visibility:
 *           type: string
 *           description: The post visibility to users. Could be PUBLIC or MEMBERS_ONLY
 *           example: PUBLIC
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When the post was created.
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: When the post was last modified.
 *         publishedAt:
 *           type: string
 *           format: date-time
 *           description: When the post was published to the public.
 *
 *     CreatePostDto:
 *       type: object
 *       required:
 *         - title
 *         - content
 *         - isDraft
 *         - isMembersOnly
 *       properties:
 *         title:
 *           type: string
 *           description: Post title
 *           minLength: 3
 *           maxLength: 60
 *         content:
 *           type: string
 *           format: password
 *           description: Post content
 *           minLength: 10
 *           maxLength: 32024
 *         isDraft:
 *           type: boolean
 *           description: Whether the post is a DRAFT
 *         isMembersOnly:
 *           type: boolean
 *           description: Whether the post is for members only
 *       example:
 *         title: Very valid post title
 *         content: Some random content.
 *         isDraft: true
 *         isMembersOnly: true
 *
 *     UpdatePostDto:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *           description: Post title
 *           minLength: 3
 *           maxLength: 60
 *         content:
 *           type: string
 *           format: password
 *           description: Post content
 *           minLength: 10
 *           maxLength: 32024
 *         status:
 *           type: string
 *           enum: [DRAFT, PUBLISHED, ARCHIVED]
 *           description: Post status. Could be one of [DRAFT, PUBLISHED, ARCHIVED]
 *         visibility:
 *           type: string
 *           enum: [PUBLIC, MEMBERS_ONLY]
 *           description: Post visibility. Could be one of [PUBLIC, MEMBERS_ONLY]
 *       example:
 *         content: Updated new random content.
 *
 *     PaginationMetadata:
 *       type: object
 *       properties:
 *         total:
 *           type: number
 *           description: Total number of items
 *           example: 0
 *         limit:
 *           type: number
 *           description: Item page. Could be either 5, 10, 25.
 *           example: 5
 *         page:
 *           type: number
 *           description: Current page number
 *           example: 1
 *         totalPages:
 *           type: number
 *           description: Total number of pages
 *           example: 0
 *         hasNext:
 *           type: boolean
 *           description: Whether there is a next page
 *           example: false
 *         hasPrev:
 *           type: boolean
 *           description: Whether there is a previous page
 *           example: false
 *
 *     GetPostsResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/SuccessResponse'
 *         - type: object
 *           properties:
 *             data:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Posts retrieved successfully
 *                 items:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Post'
 *                 count:
 *                   type: number
 *                   description: Number of items in current response
 *                   example: 0
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationMetadata'
 *
 *     GetPostResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/SuccessResponse'
 *         - type: object
 *           properties:
 *             data:
 *               type: object
 *               properties:
 *                 post:
 *                   $ref: '#/components/schemas/Post'
 */
