import { defaultParams } from './report-query-param-parser';
import type { ReportsManagerParams } from '@dans-coding-world/blog-admin-features-reports-manager';

export function mergeReportQueryDefaults(params: ReportsManagerParams) {
	return {
		...defaultParams,
		...params,
		filterBy: {
			...defaultParams?.filterBy,
			...params?.filterBy
		}
	};
}
