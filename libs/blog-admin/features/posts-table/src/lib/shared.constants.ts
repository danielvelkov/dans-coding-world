export const TABLE_COLUMNS = [
  '#',
  'Title',
  'Status/Visibility',
  'Published/Edited Date',
  'Author',
  'Actions',
] as const;

export const ADMIN_ONLY_COLUMN: (typeof TABLE_COLUMNS)[number] = 'Author';
