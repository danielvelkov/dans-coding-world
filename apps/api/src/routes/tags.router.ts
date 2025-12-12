import { Router } from 'express';
import { postInjector, TagsService } from '@dans-coding-world/api-posts';
import { TagsController } from '../controllers/tags.controller';

const tagsController = new TagsController(postInjector.get(TagsService));

const tagsRouter = Router();

tagsRouter.route('/').get(tagsController.getAll).post(tagsController.create);

tagsRouter
  .route('/:id')
  .get(tagsController.get)
  .patch(tagsController.update)
  .delete(tagsController.delete);

export default tagsRouter;

/**
 * @openapi
 * tags:
 *   name: Tags
 *   description: Endpoints regarding posts' tags
 */

/**
 * @openapi
 * /tags:
 *   get:
 *     tags: [Tags]
 *     summary: Get all tags
 *     description: |
 *       Get all unique tags used in PUBLISHED posts.
 *
 *       **Authentication:**
 *       - If access_token is valid, tags on user's private posts that are DRAFT or ARCHIVED are also included in the results
 *     responses:
 *       200:
 *         description: Tags retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GetAllTagsResponse'
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InternalServerError'
 */

/**
 * @openapi
 * /tags/{id}:
 *   get:
 *     tags: [Tags]
 *     summary: Get a tag by Id
 *     description: |
 *       Get a specific tag by its Id
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Numeric ID of the tag
 *     responses:
 *       200:
 *         description: Tag retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TagResponse'
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
 *       404:
 *         description: Not Found - Tag does not exist
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
 * /tags:
 *   post:
 *     tags: [Tags]
 *     summary: Create a new tag
 *     description: |
 *       Roles required: ADMIN or AUTHOR
 *
 *       Create a new tag. <br />
 *       Must be logged in, otherwise returns UNAUTHORIZED error.<br />
 *       Tag names must be unique - returns CONFLICT error if tag name already exists.
 *
 *       **Authentication:**
 *       - If access_token is not valid in Set-Cookie header, return 401 UNAUTHORIZED error
 *       - If access_token is valid, user can create tags
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTagDto'
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: '#/components/schemas/CreateTagDto'
 *     responses:
 *       201:
 *         description: Tag created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TagResponse'
 *       400:
 *         description: Bad Request - Invalid tag data
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
 *       409:
 *         description: Conflict - Tag name already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               data: null
 *               error:
 *                 status: 409
 *                 errorCode: SER003
 *                 message: Tag with this name already exists
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InternalServerError'
 */

/**
 * @openapi
 * /tags/{id}:
 *   patch:
 *     tags: [Tags]
 *     summary: Update a tag by Id
 *     description: |
 *       Roles required: ADMIN or AUTHOR
 *
 *       Update a tag's name. <br/>
 *       Tag names must be unique - returns CONFLICT error if new name already exists.
 *
 *       **Authentication:**
 *       - If access_token is not valid in Set-Cookie header, return 401 UNAUTHORIZED error
 *       - If access_token is valid, user can update tags if he is ADMIN or AUTHOR
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Numeric ID of the tag
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateTagDto'
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: '#/components/schemas/UpdateTagDto'
 *     responses:
 *       200:
 *         description: Tag updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TagResponse'
 *       400:
 *         description: Bad Request - Invalid params | Invalid form body
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
 *         description: Not Found - Tag does not exist
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
 *       409:
 *         description: Conflict - Tag name already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               data: null
 *               error:
 *                 status: 409
 *                 errorCode: SER003
 *                 message: Tag with this name already exists
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InternalServerError'
 */

/**
 * @openapi
 * /tags/{id}:
 *   delete:
 *     tags: [Tags]
 *     summary: Delete a tag by Id
 *     description: |
 *       Roles required: ADMIN or AUTHOR
 *
 *       Delete a tag. This will remove the tag from all posts that use it.
 *
 *       **Authentication:**
 *       - If access_token is not valid in Set-Cookie header, return 401 UNAUTHORIZED error
 *       - If access_token is valid, user can delete tags if he is ADMIN or AUTHOR
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Numeric ID of the tag
 *     responses:
 *       200:
 *         description: Tag deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TagResponse'
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
 *       404:
 *         description: Not Found - Tag does not exist
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
 *     Tag:
 *       type: object
 *       properties:
 *         id:
 *           type: number
 *           description: Tag Id.
 *           example: 1
 *         name:
 *           type: string
 *           description: Tag name (unique)
 *           minLength: 2
 *           maxLength: 50
 *           example: technology
 *
 *     CreateTagDto:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *           description: Tag name (must be unique)
 *           minLength: 2
 *           maxLength: 50
 *       example:
 *         name: technology
 *
 *     UpdateTagDto:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *           description: Tag name (must be unique)
 *           minLength: 2
 *           maxLength: 50
 *       example:
 *         name: tech
 *
 *     GetAllTagsResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/SuccessResponse'
 *         - type: object
 *           properties:
 *             data:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Tags retrieved successfully
 *                 items:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Tag'
 *                 count:
 *                   type: number
 *                   description: Number of items in current response
 *                   example: 1
 *
 *     TagResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/SuccessResponse'
 *         - type: object
 *           properties:
 *             data:
 *               type: object
 *               properties:
 *                 tag:
 *                   $ref: '#/components/schemas/Tag'
 */
