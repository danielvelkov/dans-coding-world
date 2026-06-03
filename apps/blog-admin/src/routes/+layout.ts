// This disables SSR globally
export const ssr = false;

// This disables Client Side Rendering globally
// export const csr = false;

import { QueryClient } from '@tanstack/svelte-query';
import type { LayoutLoad } from './$types';
import { browser } from '$app/environment';

export const load: LayoutLoad = () => {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				enabled: browser
			}
		}
	});

	return { queryClient };
};
