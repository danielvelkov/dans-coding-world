import { GetUsersDto } from '@dans-coding-world/shared-user-dto';

export const TABLE_COLUMNS = [
  'Show Row Details',
  'Username',
  'Email',
  'Role',
  'Status',
  'Actions',
] as const;

/** Columns that will exist but will not have their column name visible */
export const OMITTED_COLUMN_NAMES: (typeof TABLE_COLUMNS)[number][] = [
  'Show Row Details',
];

export const USERS_LOADING_MESSAGE = 'Loading users...';
export const USERS_EMPTY_MESSAGE = 'No users yet';
export const USERS_NO_RESULTS_MESSAGE = 'No users match your criteria';

export type UserSorting = GetUsersDto['sortBy'];
type SortOption = { value: UserSorting; label: string };

export type UserRole = NonNullable<GetUsersDto['filterBy']>['role'];

type FilterOption = {
  value: UserRole;
  label: string;
};

export const SORT_OPTIONS: SortOption[] = [
  {
    label: 'Username (Z-A)',
    value: {
      username: 'desc',
    },
  },
  {
    label: 'Username (A-Z)',
    value: {
      username: 'asc',
    },
  },
] as const;

export const FILTER_OPTIONS: FilterOption[] = [
  {
    value: 'USER',
    label: 'User',
  },
  {
    value: 'AUTHOR',
    label: 'Author',
  },
  {
    value: 'MOD',
    label: 'Mod',
  },
  {
    value: 'ADMIN',
    label: 'Admin',
  },
];
