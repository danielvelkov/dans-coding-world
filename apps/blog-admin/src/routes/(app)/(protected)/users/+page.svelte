<script lang="ts">
	import { getAuth } from '$lib/shared/auth.svelte';
	import { Forbidden } from '@dans-coding-world/blog-admin-ui-errors';
	import { page } from '$app/state';
	import {
		UsersManager,
		type UsersManagerParams
	} from '@dans-coding-world/blog-admin-features-users-manager';
	import { toast } from '$lib/shared/toast.svelte';
	import UserQueryParamsParser from '$lib/util/users/user-query-param-parser';
	import { resetParams } from '$lib/util/users/user-query-param-reset';
	import { omitDefaultUserQueryParams } from '$lib/util/users/omit-default-user-query-params';
	import { resolve } from '$app/paths';
	import { parseQueryString, stringifyToQueryString } from '@dans-coding-world/helpers';
	import { goto } from '$app/navigation';
	import { mergeUserQueryDefaults } from '$lib/util/users/merge-user-query-defaults';

	const authStateManager = getAuth();
	const user = $derived(authStateManager.user);

	const canViewUsers = $derived(user && user.role === 'ADMIN');

	const searchParams = $derived(page.url.searchParams);
	const rawParams = $derived(parseQueryString(searchParams.toString()));

	const params: UsersManagerParams = $derived.by(() => {
		const { success, error, data } = UserQueryParamsParser().safeParse(rawParams);
		if (success) return mergeUserQueryDefaults((data as UsersManagerParams) || {});
		// TODO: handle errors
		if (error) {
			// console.error(error);
		}
		return;
	});

	const onParamsChange = async (newParams?: UsersManagerParams) => {
		newParams = resetParams(params, newParams);

		const filteredValues = omitDefaultUserQueryParams(newParams ?? {});
		const query = stringifyToQueryString(filteredValues);
		await goto(resolve(query ? `/users?${query}` : '/users'), {
			keepFocus: true
		});
	};

	function onUserDelete(user: { id: number }) {
		toast.info(`User #${user?.id} deleted`);
	}
	function onUserBanned(user: { id: number; isBanned: boolean }) {
		toast.info(`User #${user?.id} ${user.isBanned ? 'banned' : 'unbanned'}`);
	}
	function onUserRoleChange(user: { id: number; role: string }) {
		toast.info(`User #${user?.id} role changed to ${user.role}`);
	}
</script>

<svelte:head>
	<title>Users</title>
</svelte:head>

{#if !user}{:else if !canViewUsers}
	<Forbidden message="You do not have permission to access this page"></Forbidden>
{:else}
	<UsersManager
		loggedInUser={user}
		{params}
		{onParamsChange}
		{onUserDelete}
		{onUserBanned}
		{onUserRoleChange}
	></UsersManager>
{/if}
