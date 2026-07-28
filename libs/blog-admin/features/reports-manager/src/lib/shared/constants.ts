import { GetReportsDto } from '@dans-coding-world/shared-report-dto';

export const TABLE_COLUMNS = [
  'Show Row Details',
  'Reason',
  'Status',
  'Created Date',
  'Post',
  'Reported',
  'Actions',
] as const;

/** Columns that will exist but will not have their column name visible */
export const OMITTED_COLUMN_NAMES: (typeof TABLE_COLUMNS)[number][] = [
  'Show Row Details',
];

export const REPORTS_LOADING_MESSAGE = 'Loading reports...';
export const REPORTS_EMPTY_MESSAGE = 'No reports yet';
export const REPORTS_NO_RESULTS_MESSAGE = 'No reports match your criteria';

export type ReportSorting = GetReportsDto['sortBy'];
type SortOption = { value: ReportSorting; label: string };

export type ReportStatusFilter = NonNullable<
  GetReportsDto['filterBy']
>['status'];

export type ReportStatus = NonNullable<ReportStatusFilter>[number];

type FilterOption = {
  value: ReportStatus;
  label: string;
};

export const SORT_OPTIONS: SortOption[] = [
  {
    label: 'Created (desc)',
    value: {
      createdAt: 'desc',
    },
  },
  {
    label: 'Created (asc)',
    value: {
      createdAt: 'asc',
    },
  },
] as const;

export const FILTER_OPTIONS: FilterOption[] = [
  {
    value: 'DISMISSED',
    label: 'Dismissed',
  },
  {
    value: 'PENDING',
    label: 'Pending',
  },
  {
    value: 'RESOLVED',
    label: 'Resolved',
  },
  {
    value: 'REVIEWING',
    label: 'Reviewing',
  },
];
