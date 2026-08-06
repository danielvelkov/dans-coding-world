<script lang="ts">
  import {
    createDeleteUserMutation,
    createUpdateUserBanStatusMutation,
    createUpdateUserRoleMutation,
    createUsersQuery,
    createUsersQueryInfinite,
    debounceCallback,
  } from '@dans-coding-world/blog-admin-data-access-operations';
  import {
    TablePaginationInfo,
    TablePagination,
    TableItemsPerPageSelect,
  } from '@dans-coding-world/blog-admin-ui-common';
  import { createPaginationHandlers } from '@dans-coding-world/helpers';
  import { PAGINATION } from '@dans-coding-world/shared-constants';
  import type { UserDetail } from '@dans-coding-world/user-data-access';
  import type { UsersManagerParams } from './types/usersManagerParams.js';
  import UserFilter from './components/UserFilter.svelte';
  import UsersTable from './components/UserTable.svelte';
  import type { UserRole } from './shared/user-table.constants.js';

  const {
    params,
    onParamsChange = () => {},
    loggedInUser,
    onUserDelete,
    onUserBanned,
    onUserRoleChange,
  }: {
    params?: UsersManagerParams;
    onParamsChange?: (value: UsersManagerParams) => void;
    loggedInUser?: Omit<UserDetail, 'password'>;
    onUserDelete: (user: { id: number }) => void;
    onUserBanned: (user: Omit<UserDetail, 'password'>) => void;
    onUserRoleChange: (user: { id: number; role: string }) => void;
  } = $props();

  let searchedUser = $state('');

  // Queries

  // Get users
  const usersQueryResult = $derived(createUsersQuery(params));
  const usersQueryInfiniteResult = $derived(
    createUsersQueryInfinite({
      sortBy: { username: 'asc' },
      searchQuery: searchedUser.length > 0 ? searchedUser : undefined,
    }),
  );
  const refetch = $derived(usersQueryResult.refetch);
  const isLoading = $derived(usersQueryResult.isLoading);
  const users = $derived(usersQueryResult.data?.items ?? []);
  const getUsersError = $derived(usersQueryResult.error);
  const total = $derived(usersQueryResult.data?.pagination.total ?? 0);
  const currentPage = $derived(usersQueryResult.data?.pagination.page ?? 1);
  const itemsPerPage = $derived(
    usersQueryResult.data?.pagination.limit ??
      PAGINATION.USERS.DEFAULT_ITEMS_PER_PAGE,
  );
  const totalPages = $derived(Math.ceil(total / itemsPerPage));

  // Delete user
  const deleteUserMutation = $derived(
    createDeleteUserMutation({ throwOnError: false }),
  );
  const deleteUserMutate = $derived(deleteUserMutation.mutate);
  const deleteUserError = $derived(deleteUserMutation.error);
  const reset = $derived(deleteUserMutation.reset);

  // Ban/Unban user
  const createUpdateUserBanStatusMutationQuery = $derived(
    createUpdateUserBanStatusMutation(),
  );
  const mutateUserBanStatus = $derived(
    createUpdateUserBanStatusMutationQuery.mutate,
  );
  const banUserError = $derived(createUpdateUserBanStatusMutationQuery.error);

  // Change role
  const createUpdateUserRoleMutationQuery = $derived(
    createUpdateUserRoleMutation(),
  );
  const mutateUpdateUserRole = $derived(
    createUpdateUserRoleMutationQuery.mutate,
  );
  const updateUserRoleError = $derived(createUpdateUserRoleMutationQuery.error);

  const activeError = $derived(
    getUsersError || deleteUserError || banUserError || updateUserRoleError,
  );

  const { handlePageSelect, handleItemsPerPageSelect } = $derived.by(() => {
    return createPaginationHandlers(params ?? {}, onParamsChange, {
      defaultPageSize: PAGINATION.USERS.DEFAULT_ITEMS_PER_PAGE,
    });
  });

  const isSearchingAuthor = $derived(
    usersQueryResult.isFetching && searchedUser.length > 0,
  );

  const handleSearchDebounced = debounceCallback(async (value: string) => {
    searchedUser = value;
  }, 300);

  const handleUserDelete = (id: number) => {
    reset();
    if (loggedInUser) {
      deleteUserMutate(
        { userToDeleteId: id },
        {
          onSuccess: () => {
            onUserDelete({ id });
          },
        },
      );
      // Go to previous page if deleting last user on current page
      const isLastUser =
        users.at(-1)?.id === id && users.length === 1 && total > 1;
      if (isLastUser && params?.pageOffset && params.pageOffset > 0)
        onParamsChange({
          ...params,
          pageOffset:
            params.pageOffset -
            (params.pageSize ?? PAGINATION.USERS.DEFAULT_ITEMS_PER_PAGE),
        });
    }
  };

  function handleUserBanStatusChange(
    id: number,
    isBanned: boolean,
    onSettled?: () => void,
  ) {
    mutateUserBanStatus(
      {
        userToChangeId: id,
        isBanned: isBanned,
      },
      {
        onSuccess: (data) => {
          if (data?.user) {
            refetch();
            onUserBanned(data.user);
          }
        },
        onSettled,
      },
    );
  }

  function handleUserRoleChange(
    id: number,
    newRole: NonNullable<UserRole>,
    onSettled?: () => void,
  ) {
    mutateUpdateUserRole(
      {
        userId: id,
        role: newRole,
      },
      {
        onSuccess: (data) => {
          if (data?.user) {
            refetch();
            onUserRoleChange(data.user);
          }
        },
        onSettled,
      },
    );
  }
</script>

<div class="space-y-6 flex flex-col items-stretch mx-auto lg:px-20 w-full">
  <div class="flex flex-col gap-5">
    <h2 class="text-3xl font-bold">Users</h2>
    {#if activeError}
      <div
        data-testid="users-error-message"
        class="p-2 self-start text-sm text-center text-(--color-error) bg-(--color-error-bg) rounded-md m-1"
      >
        <i class="fa fa-exclamation-circle mr-2"></i>
        {activeError.message}
      </div>
    {/if}
    <UserFilter
      handleSearch={(val) => {
        handleSearchDebounced(val);
      }}
      filters={{ searchQuery: params?.searchQuery }}
      onChange={(val) =>
        onParamsChange({
          ...params,
          searchQuery: val.searchQuery,
        })}
      queryData={usersQueryInfiniteResult}
      loadNext={async () => {
        await usersQueryInfiniteResult.fetchNextPage();
      }}
      isSearching={isSearchingAuthor}
    ></UserFilter>
  </div>

  <UsersTable
    {users}
    {isLoading}
    {params}
    {onParamsChange}
    error={getUsersError ?? undefined}
    viewer={loggedInUser}
    onUserDelete={handleUserDelete}
    onUserBanStatusChange={handleUserBanStatusChange}
    onUserRoleChange={handleUserRoleChange}
  />

  {#if total > itemsPerPage}
    <div class="flex justify-between items-center-safe flex-wrap gap-5">
      <div class="flex flex-col gap-2">
        <TablePaginationInfo {currentPage} {total} {itemsPerPage}
        ></TablePaginationInfo>

        <TableItemsPerPageSelect
          currentValue={params?.pageSize ??
            PAGINATION.USERS.DEFAULT_ITEMS_PER_PAGE}
          values={[...PAGINATION.USERS.ITEMS_PER_PAGE_OPTIONS]}
          onChange={handleItemsPerPageSelect}
        ></TableItemsPerPageSelect>
      </div>

      <TablePagination
        {currentPage}
        {totalPages}
        onPageSelect={handlePageSelect}
      />
    </div>
  {/if}
</div>
