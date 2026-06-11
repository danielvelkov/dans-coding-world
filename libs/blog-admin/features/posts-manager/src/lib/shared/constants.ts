import { GetPostsDto } from '@dans-coding-world/shared-post-dto';

export const TABLE_COLUMNS = [
  'Show Row Details',
  '#',
  'Title',
  'Status/Visibility',
  'Published/Edited Date',
  'Author',
  'Actions',
] as const;

export const ADMIN_ONLY_COLUMN: (typeof TABLE_COLUMNS)[number] = 'Author';

/** Columns that will exist but will not have their column name visible */
export const OMITTED_COLUMN_NAMES: (typeof TABLE_COLUMNS)[number][] = [
  'Show Row Details',
];

export const POSTS_LOADING_MESSAGE = 'Loading posts...';
export const POSTS_EMPTY_MESSAGE = 'No posts yet - Create your first post';
export const POSTS_NO_RESULTS_MESSAGE = 'No posts match your criteria';

export type PostSorting = GetPostsDto['sortBy'];
type SortOption = { value: PostSorting; label: string };
export const SORT_OPTIONS: SortOption[] = [
  {
    label: 'Published (desc)',
    value: {
      publishedAt: 'desc',
    },
  },
  {
    label: 'Published (asc)',
    value: {
      publishedAt: 'asc',
    },
  },
  {
    label: 'Modified (asc)',
    value: {
      updatedAt: 'asc',
    },
  },
  {
    label: 'Modified (desc)',
    value: {
      updatedAt: 'desc',
    },
  },
] as const;
