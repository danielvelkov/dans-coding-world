<script lang="ts">
	import { ReportDetails } from '@dans-coding-world/blog-admin-features-report-details';
	import { createReportQuery } from '@dans-coding-world/blog-admin-data-access-operations';
	import { getAuth } from '$lib/shared/auth.svelte';
	import type { ReportDetailExtended } from '@dans-coding-world/report-data-access';

	import { page } from '$app/state';
	import { Forbidden, GenericError } from '@dans-coding-world/blog-admin-ui-errors';
	import { SpinnerLoader } from '@dans-coding-world/blog-admin-ui-common';
	import { toast } from '$lib/shared/toast.svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	const reportId = $derived(Number(page.params.id));

	const authStateManager = getAuth();
	const user = $derived(authStateManager.user);

	const reportQuery = $derived.by(() =>
		Number.isInteger(reportId) ? createReportQuery(reportId) : undefined
	);

	const error = $derived(reportQuery?.error);
	const report = $derived(reportQuery?.data?.report);
	const refetch = $derived(reportQuery?.refetch);

	const canViewReport = $derived(
		Number.isInteger(reportId) &&
			user &&
			report &&
			(user.role === 'ADMIN' || report.reportedComment.userId !== user.id)
	);

	function onReportStatusChange(editedReport: ReportDetailExtended) {
		toast.info(`Report #${editedReport.id} saved`);
	}

	function onReportDeleted(deletedReport: ReportDetailExtended) {
		goto(resolve('/(app)/(protected)/reports/comments')).then(() => {
			toast.info(`Report #${deletedReport.id} deleted`);
		});
	}

	function onCommentDeleted(deletedComment: NonNullable<typeof report>['reportedComment']) {
		goto(resolve('/(app)/(protected)/reports/comments')).then(() => {
			toast.info(`Comment #${deletedComment.id} and report deleted`);
		});
	}

	function onReportedUserStatusChange(
		user: Omit<NonNullable<typeof report>['reportedComment']['user'], 'password'>
	) {
		refetch?.();
		toast.info(`User #${user.username} ${user.isBanned ? 'banned' : 'unbanned'}`);
	}
</script>

<svelte:head>
	<title>Report #{report?.id}</title>
</svelte:head>

{#if !Number.isInteger(reportId)}
	<GenericError message={`Invalid report id: ${reportId}`}></GenericError>
{:else if error}
	<GenericError statusCode={error.status ?? '500'} message={error.message}></GenericError>
{:else if !user || !report}
	<div class="mt-10 flex w-full flex-col items-center gap-5">
		<SpinnerLoader class="border-(--color-accent)!" loadingMessage="Loading report..."
		></SpinnerLoader>
		<p><i>Loading report...</i></p>
	</div>
{:else if !canViewReport}
	<Forbidden message="You do not have permission view this page"></Forbidden>
{:else if report}
	<ReportDetails
		{report}
		loggedInUser={user}
		onReportEdit={onReportStatusChange}
		onReportDelete={onReportDeleted}
		onCommentDelete={onCommentDeleted}
		{onReportedUserStatusChange}
	></ReportDetails>
{/if}
