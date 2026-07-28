<script lang="ts">
	import { getAuth } from '$lib/shared/auth.svelte';
	import { Forbidden } from '@dans-coding-world/blog-admin-ui-errors';
	import { page } from '$app/state';
	import {
		ReportsManager,
		type ReportsManagerParams
	} from '@dans-coding-world/blog-admin-features-reports-manager';
	import { toast } from '$lib/shared/toast.svelte';
	import { mergeReportQueryDefaults } from '$lib/util/reports/merge-report-query-defaults';
	import ReportQueryParamsParser from '$lib/util/reports/report-query-param-parser';
	import { resetParams } from '$lib/util/reports/report-query-param-reset';
	import { omitDefaultReportQueryParams } from '$lib/util/reports/omit-default-report-query-params';
	import { resolve } from '$app/paths';
	import { parseQueryString, stringifyToQueryString } from '@dans-coding-world/helpers';
	import { goto } from '$app/navigation';

	const authStateManager = getAuth();
	const user = $derived(authStateManager.user);

	const canViewReports = $derived(user && (user.role === 'ADMIN' || user.role === 'MOD'));

	const searchParams = $derived(page.url.searchParams);
	const rawParams = $derived(parseQueryString(searchParams.toString()));

	const params: ReportsManagerParams = $derived.by(() => {
		const { success, error, data } = ReportQueryParamsParser().safeParse(rawParams);
		if (success) return mergeReportQueryDefaults((data as ReportsManagerParams) || {});
		// TODO: handle errors
		if (error) {
			// console.error(error);
		}
		return;
	});

	const onParamsChange = async (newParams?: ReportsManagerParams) => {
		newParams = resetParams(params, newParams);

		const filteredValues = omitDefaultReportQueryParams(newParams ?? {});
		const query = stringifyToQueryString(filteredValues);
		await goto(resolve(query ? `/reports/comments?${query}` : '/reports/comments'), {
			keepFocus: true
		});
	};

	function onReportDelete(report: { id: number }) {
		toast.info(`Report #${report?.id} deleted`);
	}
</script>

<svelte:head>
	<title>Comment Reports</title>
</svelte:head>

{#if !user}{:else if !canViewReports}
	<Forbidden message="You do not have permission to access this page"></Forbidden>
{:else}
	<ReportsManager loggedInUser={user} {params} {onParamsChange} {onReportDelete}></ReportsManager>
{/if}
