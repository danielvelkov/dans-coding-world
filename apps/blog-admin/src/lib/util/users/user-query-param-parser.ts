import z from 'zod';
import { PAGINATION, USER_CONSTRAINTS } from '@dans-coding-world/shared-constants';
import type { Role } from '@dans-coding-world/prisma-schema';
import type { UsersManagerParams } from '@dans-coding-world/blog-admin-features-users-manager';

export const defaultParams: UsersManagerParams = {
	// None for now
} as const;

export const UserQueryParamsParser = () =>
	z
		.object({
			filterBy: z.optional(
				z.object({
					isBanned: z.optional(z.coerce.boolean()),
					role: z.optional(z.enum(['ADMIN', 'AUTHOR', 'MOD', 'USER'] as Role[]))
				})
			),
			searchQuery: z.optional(z.string().max(USER_CONSTRAINTS.MAX_USERNAME_LENGTH)),
			sortBy: z.optional(
				z
					.object({
						username: z.enum(['asc', 'desc'])
					})
					.partial()
			),
			pageSize: z.optional(
				z.coerce
					.number()
					.pipe(z.union(PAGINATION.USERS.ITEMS_PER_PAGE_OPTIONS.map((size) => z.literal(size))))
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

export default UserQueryParamsParser;
