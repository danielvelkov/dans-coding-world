export const TABLE_COLUMNS = [
  '#',
  'Title',
  'Status/Visibility',
  'Published/Edited Date',
  'Author',
  'Actions',
] as const;

export const ADMIN_ONLY_COLUMN: (typeof TABLE_COLUMNS)[number] = 'Author';

export const POSTS_LOADING_MESSAGE = 'Loading posts...';
export const POSTS_EMPTY_MESSAGE = 'No posts yet - Create your first post';
export const POSTS_NO_RESULTS_MESSAGE = 'No posts match your criteria';
