import type { UsersManagerParams } from '@dans-coding-world/blog-admin-features-users-manager';

function shouldResetPageOffset(oldParams: UsersManagerParams, newParams: UsersManagerParams) {
	return (
		JSON.stringify(oldParams?.filterBy) !== JSON.stringify(newParams?.filterBy) ||
		oldParams?.searchQuery !== newParams?.searchQuery
	);
}

export function resetParams(oldParams: UsersManagerParams, newParams: UsersManagerParams) {
	if (shouldResetPageOffset(oldParams, newParams) && newParams?.pageOffset !== undefined)
		newParams.pageOffset = 0;
	return newParams;
}
