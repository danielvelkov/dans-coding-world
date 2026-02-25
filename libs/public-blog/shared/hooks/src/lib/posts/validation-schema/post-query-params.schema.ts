import z from 'zod';
import {
  PAGINATION,
  POST_CONSTRAINTS,
} from '@dans-coding-world/shared-constants';
import { defaultFilters } from '../utils/merge-post-query-defaults';
import { PostVisibility } from '@dans-coding-world/prisma-schema';

export const PostQueryParams = z
  .object({
    filterBy: z.optional(
      z.object({
        year: z.optional(z.coerce.number()),
        tags: z.optional(z.array(z.string())),
        visibility: z.optional(
          z
            .array(z.enum(['PUBLIC', 'MEMBERS_ONLY']))
            .superRefine((val, ctx) => {
              const uniqueVals = new Set(val);
              if (uniqueVals.size !== val.length)
                ctx.addIssue({
                  code: 'custom',
                  message: 'Array items must be unique',
                });
            })
            .default(defaultFilters.filterBy?.visibility as PostVisibility[])
        ),
        status: z.tuple([z.literal('PUBLISHED')]).optional(),
      })
    ),
    sortBy: z.optional(
      z
        .object({
          updatedAt: z.enum(['asc', 'desc']),
          publishedAt: z.enum(['asc', 'desc']),
        })
        .partial()
        .default({ ...defaultFilters.sortBy })
    ),
    searchQuery: z.optional(z.string().max(POST_CONSTRAINTS.MAX_TITLE_LENGTH)),
    pageSize: z.optional(
      z.coerce
        .number()
        .pipe(
          z.union(
            PAGINATION.POSTS.ITEMS_PER_PAGE_OPTIONS.map((size) =>
              z.literal(size)
            )
          )
        )
    ),
    pageOffset: z.optional(z.coerce.number()),
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
      error: 'if pageSize specified - offset must be divisible by pageSize',
    }
  )
  .transform((data) => ({
    ...data,
    filterBy: {
      ...data.filterBy,
      status: ['PUBLISHED'],
    },
  }));

export default PostQueryParams;
