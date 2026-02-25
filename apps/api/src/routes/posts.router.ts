import { Router } from 'express';
import { postInjector, PostsService } from '@dans-coding-world/api-posts';
import { PostsController } from '../controllers/posts.controller';

const postsController = new PostsController(postInjector.get(PostsService));

const postsRouter = Router();

postsRouter.route('/').get(postsController.getAll).post(postsController.create);

postsRouter.route('/metadata').get(postsController.getMetadata);
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
 *     summary: Get a single post by Id
 *     description: |
 *       Get a specific post by its Id.
 *
 *       Returns 403 FORBIDDEN error If post is private and the user requesting it
 *       is not the author (**does not apply to admins or moderators**).
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
 *     summary: Get posts with pagination metadata
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
 *       - If access_token is valid and user is ADMIN, search query for private posts retrieve not only the admin's posts
 *     parameters:
 *       - in: query
 *         name: pageOffset
 *         schema:
 *           type: integer
 *           minimum: 0
 *         required: false
 *         description: Page offset for pagination (**if pageSize specified - offset must be divisible by pageSize**)
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
 *         name: filterBy[year]
 *         schema:
 *           type: number
 *         required: false
 *         description: Filter by posts' publishedAt date year
 *       - in: query
 *         name: filterBy[tags]
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             minLength: 2
 *             maxLength: 50
 *             pattern: '^[a-z0-9-]+$'
 *         style: form
 *         required: false
 *         description: Filter by tags (can specify multiple | no repeating tags)
 *       - in: query
 *         name: searchQuery
 *         schema:
 *           type: string
 *           maxLength: 255
 *         required: false
 *         description: Search query to filter posts by title or content. Not case-sensitive
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
 *     summary: Create a post
 *     description: |
 *       Roles required: ADMIN or AUTHOR
 *
 *       Create a blog post.
 *
 *       Posts that are created with 'isDraft' set to FALSE, have their publishedDate set to current date and time.
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
 *     summary: Update a post by Id
 *     description: |
 *       Roles required: ADMIN or AUTHOR
 *
 *       Update a post's fields by its Id.
 *
 *       Returns 403 FORBIDDEN error If post is either DRAFT or ARCHIVED and the user requesting it
 *       is not the author (**does not apply to admins**).
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
 *       401:
 *         description: Unauthorized - Login first
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
 * /posts/{postId}:
 *   delete:
 *     tags: [Posts]
 *     summary: Delete a post by Id
 *     description: |
 *       Roles required: ADMIN or AUTHOR
 *
 *       Delete a post by its Id.
 *
 *       Returns 403 FORBIDDEN error if the user requesting it
 *       is not the author (**does not apply to admins**).
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
 * /posts/metadata:
 *   get:
 *     tags: [Posts]
 *     summary: Get posts metadata
 *     description: |
 *       Get posts metadata like all the unique years PUBLISHED posts were published at.
 *     responses:
 *       200:
 *         description: Posts metadata retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GetPostsMetadataResponse'
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
 *         title:
 *           type: string
 *           description: The post's title
 *           example: How i made an API
 *         content:
 *           type: string
 *           description: The post's content
 *           example: Today i will talk about...
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
 *         tags:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/PostTag'
 *         author:
 *           $ref: '#/components/schemas/AuthorPreview'
 *
 *     AuthorPreview:
 *       type: object
 *       properties:
 *         id:
 *           type: number
 *           description: Author Id.
 *           example: 1
 *         username:
 *           type: number
 *           description: Author username
 *           example: johnDoe13
 *         profile:
 *           $ref: '#/components/schemas/Profile'
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
 *         tags:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/PostTag'
 *           description: Attach or create tags just by specifying names (can specify multiple | no repeating tags)
 *       example:
 *         title: Very valid post title
 *         content: Some random content.
 *         isDraft: true
 *         isMembersOnly: true
 *         tags: ['tag-1']
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
 *         tags:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/PostTag'
 *           description: Attach or create tags just by specifying names (can specify multiple | no repeating tags)
 *       example:
 *         content: Some new random content.
 *         title: Some new title name
 *         status: PUBLISHED
 *         visibility: PUBLIC
 *         tags: ['javascript']
 *
 *     PaginationMetadata:
 *       type: object
 *       properties:
 *         total:
 *           type: number
 *           description: Total number of items
 *           example: 1
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
 *           example: 1
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
 *
 *     GetPostsMetadataResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/SuccessResponse'
 *         - type: object
 *           properties:
 *             data:
 *               type: object
 *               properties:
 *                 years:
 *                   type: array
 *                   items:
 *                     type: number
 *                     example: 2001
 *
 *     PostTag:
 *       type: string
 *       example: 'tag-1'
 */
