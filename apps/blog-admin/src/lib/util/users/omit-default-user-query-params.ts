import type { UsersManagerParams } from '@dans-coding-world/blog-admin-features-users-manager';

export const omitDefaultUserQueryParams = (value: NonNullable<UsersManagerParams>) => {
	const filteredValues = {
		...value,
		sortBy: value.sortBy ? { ...value.sortBy } : undefined,
		filterBy: value.filterBy ? { ...value.filterBy } : undefined
	};

	if (filteredValues.pageOffset !== undefined && filteredValues.pageOffset === 0)
		delete filteredValues.pageOffset;

	return filteredValues;
};
