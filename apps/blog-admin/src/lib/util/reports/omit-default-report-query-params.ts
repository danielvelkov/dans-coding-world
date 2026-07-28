import type { ReportsManagerParams } from '@dans-coding-world/blog-admin-features-reports-manager';

export const omitDefaultReportQueryParams = (value: NonNullable<ReportsManagerParams>) => {
	const filteredValues = {
		...value,
		sortBy: value.sortBy ? { ...value.sortBy } : undefined,
		filterBy: value.filterBy ? { ...value.filterBy } : undefined
	};

	if (filteredValues.sortBy?.createdAt === 'desc') delete filteredValues.sortBy.createdAt;
	if (
		filteredValues.filterBy?.status?.includes('PENDING') &&
		filteredValues.filterBy.status.length === 1
	)
		delete filteredValues.filterBy.status;
	if (filteredValues.pageOffset !== undefined && filteredValues.pageOffset === 0)
		delete filteredValues.pageOffset;

	return filteredValues;
};
