import z from 'zod';
import { PAGINATION } from '@dans-coding-world/shared-constants';
import type { ReportStatus } from '@dans-coding-world/prisma-schema';
import type { ReportsManagerParams } from '@dans-coding-world/blog-admin-features-reports-manager';

export const defaultParams: ReportsManagerParams = {
	filterBy: {
		status: ['PENDING']
	},
	sortBy: { createdAt: 'desc' }
} as const;

export const ReportQueryParamsParser = () =>
	z
		.object({
			filterBy: z.optional(
				z.object({
					maliciousUserId: z.optional(z.coerce.number()),
					postId: z.optional(z.coerce.number()),
					status: z.optional(
						z
							.array(z.enum(['PENDING', 'REVIEWING', 'RESOLVED', 'DISMISSED']))
							.superRefine((val, ctx) => {
								const uniqueVals = new Set(val);
								if (uniqueVals.size !== val.length)
									ctx.addIssue({
										code: 'custom',
										message: 'Array items must be unique'
									});
							})
							.default(defaultParams.filterBy?.status as ReportStatus[])
					)
				})
			),
			sortBy: z.optional(
				z
					.object({
						createdAt: z.enum(['asc', 'desc'])
					})
					.partial()
					.default({ ...defaultParams.sortBy })
			),
			pageSize: z.optional(
				z.coerce
					.number()
					.pipe(z.union(PAGINATION.REPORTS.ITEMS_PER_PAGE_OPTIONS.map((size) => z.literal(size))))
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
		);

export default ReportQueryParamsParser;
