import z from 'zod';
import { PAGINATION, POST_CONSTRAINTS } from '@dans-coding-world/shared-constants';
import type { PostVisibility, PostStatus } from '@dans-coding-world/prisma-schema';
import type { PostsManagerParams } from '@dans-coding-world/blog-admin-features-posts-manager';

export const defaultParams: PostsManagerParams = {
	filterBy: {
		status: ['PUBLISHED', 'ARCHIVED', 'DRAFT'],
		visibility: ['MEMBERS_ONLY', 'PUBLIC']
	},
	sortBy: { publishedAt: 'desc' }
} as const;

export const PostQueryParamsParser = (isAdmin?: boolean, userId?: number) =>
	z
		.object({
			filterBy: z.optional(
				z.object({
					year: z.optional(z.coerce.number()),
					tags: z.optional(z.array(z.string())),
					userId: z.optional(z.coerce.number()),
					visibility: z.optional(
						z
							.array(z.enum(['PUBLIC', 'MEMBERS_ONLY'] as PostVisibility[]))
							.superRefine((val, ctx) => {
								const uniqueVals = new Set(val);
								if (uniqueVals.size !== val.length)
									ctx.addIssue({
										code: 'custom',
										message: 'Array items must be unique'
									});
							})
							.default(defaultParams.filterBy?.visibility as PostVisibility[])
					),
					status: z.optional(
						z
							.array(z.enum(['ARCHIVED', 'DRAFT', 'PUBLISHED'] as PostStatus[]))
							.superRefine((val, ctx) => {
								const uniqueVals = new Set(val);
								if (uniqueVals.size !== val.length)
									ctx.addIssue({
										code: 'custom',
										message: 'Array items must be unique'
									});
							})
							.default(defaultParams.filterBy?.status as PostStatus[])
					)
				})
			),
			sortBy: z.optional(
				z
					.object({
						updatedAt: z.enum(['asc', 'desc']),
						publishedAt: z.enum(['asc', 'desc'])
					})
					.partial()
					.default({ ...defaultParams.sortBy })
			),
			searchQuery: z.optional(z.string().max(POST_CONSTRAINTS.MAX_TITLE_LENGTH)),
			pageSize: z.optional(
				z.coerce
					.number()
					.pipe(z.union(PAGINATION.POSTS.ITEMS_PER_PAGE_OPTIONS.map((size) => z.literal(size))))
			),
			pageOffset: z.optional(z.coerce.number())
		})
		.refine(
			({ pageOffset, pageSize }) => {
				if (pageSize === undefined || pageOffset === undefined) return true;

				return (
					typeof pageOffset === 'number' &&
					typeof pageSize === 'number' &&
					pageSize > 0 &&
					pageOffset % pageSize === 0
				);
			},
			{
				path: ['pageOffset'],
				error: 'if pageSize specified - offset must be divisible by pageSize'
			}
		)
		.transform((data) => ({
			...data,
			filterBy: {
				...data.filterBy,
				...(isAdmin !== undefined && !isAdmin && { userId })
			}
		}));

export default PostQueryParamsParser;
