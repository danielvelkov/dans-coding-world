import type { ReportsManagerParams } from '@dans-coding-world/blog-admin-features-reports-manager';

function shouldResetPageOffset(oldParams: ReportsManagerParams, newParams: ReportsManagerParams) {
	return JSON.stringify(oldParams?.filterBy) !== JSON.stringify(newParams?.filterBy);
}

export function resetParams(oldParams: ReportsManagerParams, newParams: ReportsManagerParams) {
	if (shouldResetPageOffset(oldParams, newParams) && newParams?.pageOffset !== undefined)
		newParams.pageOffset = 0;
	return newParams;
}
