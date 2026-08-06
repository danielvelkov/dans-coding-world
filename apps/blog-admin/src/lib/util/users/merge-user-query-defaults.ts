import { defaultParams } from './user-query-param-parser';
import type { UsersManagerParams } from '@dans-coding-world/blog-admin-features-users-manager';

export function mergeUserQueryDefaults(params: UsersManagerParams) {
	return {
		...defaultParams,
		...params,
		filterBy: {
			...defaultParams?.filterBy,
			...params?.filterBy
		}
	};
}
