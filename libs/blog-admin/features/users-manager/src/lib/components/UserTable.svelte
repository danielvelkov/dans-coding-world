<script lang="ts">
  import { slide, fade } from 'svelte/transition';
  import {
    OMITTED_COLUMN_NAMES,
    USERS_EMPTY_MESSAGE,
    USERS_LOADING_MESSAGE,
    USERS_NO_RESULTS_MESSAGE,
    SORT_OPTIONS,
    TABLE_COLUMNS,
    FILTER_OPTIONS,
  } from '../shared/user-table.constants.js';
  import type {
    UserRole,
    UserSorting,
  } from '../shared/user-table.constants.js';
  import type { UserDetail } from '@dans-coding-world/user-data-access';
  import { toggleValue } from '@dans-coding-world/helpers';
  import {
    Button,
    Select,
    Table,
    UserRoleBadge,
  } from '@dans-coding-world/blog-admin-ui-common';
  import type { UsersManagerParams } from '../types/usersManagerParams.js';
  // import UserDeleteDialog from './UserDeleteDialog.svelte';

  interface Props {
    users?: UserDetail[];
    isLoading?: boolean;
    error?: Error;
    viewer?: Omit<UserDetail, 'password'>;
    params?: UsersManagerParams;
    onParamsChange?: (value: UsersManagerParams) => void;
    onUserDelete?: (id: number) => void;
  }

  const {
    users = [],
    isLoading = false,
    error,
    viewer,
    params,
    onParamsChange,
    // onUserDelete,
  }: Props = $props();

  let expandedRows = $state<UserDetail['id'][]>([]);
  let userForDeletion: UserDetail | null = $state(null);
  let userForRoleChange: UserDetail | null = $state(null);
  let userForBanning: UserDetail | null = $state(null);

  const showEmptyMessage = $derived(users.length === 0);
</script>

<div
  class="overflow-x-auto max-h-max min-h-fit sm:min-h-[50vh] sm:w-full w-[90vw]"
>
  <Table
    data={users.map((user, rowIndex) => ({
      user,
      rowIndex: (params?.pageOffset ?? 0) + rowIndex,
    }))}
  >
    {#snippet header()}
      <tr class="bg-(--color-bg-surface-hover)">
        {#each TABLE_COLUMNS as col (col)}
          {@render ColumnHeader(col)}
        {/each}
      </tr>

      {@render ControlRow()}
    {/snippet}

    {#if isLoading}
      {@render MessageRow(
        USERS_LOADING_MESSAGE,
        'text-(--color-text-secondary) italic',
      )}
    {:else if error}
      {@render MessageRow(error.message, 'text-(--color-error) italic')}
    {:else if showEmptyMessage}
      {@const showNoResults =
        params?.filterBy?.role ||
        params?.filterBy?.isBanned ||
        params?.searchQuery}
      {@render MessageRow(
        showNoResults ? USERS_NO_RESULTS_MESSAGE : USERS_EMPTY_MESSAGE,
        'text-(--color-text-secondary) italic',
      )}
    {/if}

    {#snippet row({ user, rowIndex })}
      {@render UserRow(user, rowIndex)}
    {/snippet}
  </Table>
</div>

{#snippet ColumnHeader(col: (typeof TABLE_COLUMNS)[number])}
  {@const isVisible = !OMITTED_COLUMN_NAMES.includes(col)}
  {@const isCenterAligned = ['Created date'].includes(col)}

  <th
    class={`px-6 py-4 text-xs font-semibold tracking-wider text-(--color-text-secondary)
       uppercase border-b border-(--color-border-subtle)  ${
         isCenterAligned ? 'text-center' : 'text-left'
       }`}
  >
    {#if isVisible}
      {col}
    {/if}
  </th>
{/snippet}

{#snippet MessageRow(message: string, classOverride: string)}
  <tr class="bg-(--color-bg-surface)">
    <td
      colspan={TABLE_COLUMNS.length}
      class="px-4 py-12 text-center border-b border-(--color-border-subtle)"
    >
      <div class={classOverride}>
        {message}
      </div>
    </td>
  </tr>
{/snippet}

{#snippet UserRow(user: UserDetail, rowIndex: number)}
  {@const disabled = viewer && user.role === 'ADMIN' && user.id !== viewer.id}
  {@const isExpanded = expandedRows.includes(user.id)}

  <tr
    in:fade
    aria-label={`Row entry #${rowIndex + 1}`}
    class="bg-(--color-bg-surface) border-b border-(--color-border-subtle)
    hover:bg-(--color-bg-surface-hover) group transition-colors {disabled
      ? 'opacity-20'
      : ''}"
    aria-expanded={isExpanded}
    aria-controls={`row-details-${user.id}`}
  >
    <!-- Expand/Collapse Button -->
    <td class="px-4 py-4 text-sm text-(--color-text-secondary)">
      <button
        class="p-1 w-5 rounded hover:bg-(--color-bg-surface-active)
         text-(--color-text-secondary) focus:outline-hidden focus:ring-2
          focus:ring-(--color-accent-hover)"
        aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
        onclick={() => {
          expandedRows = toggleValue(expandedRows, user.id);
        }}
      >
        <i class={`fa fa-chevron-${isExpanded ? 'down' : 'right'}`}></i>
      </button>
    </td>

    <!-- Avatar-->
    <td>
      <div
        class="w-10 h-10 rounded-full bg-(--color-bg-surface-active)
            text-(--color-text-primary) font-semibold flex justify-center
            items-center text-base border border-(--color-border-subtle) overflow-hidden"
      >
        {#if user.profile?.avatarURL}
          <img
            class="w-full h-full object-cover rounded-full"
            src={user.profile.avatarURL}
            alt={`${user.username}'s avatar`}
          />
        {:else}
          <span class="select-none">
            {user.username[0].toUpperCase()}
          </span>
        {/if}
      </div>
    </td>

    <!-- Username -->
    <td class="px-4 py-4">
      <div
        class="text-sm font-medium text-(--color-text-primary) max-w-[40ch] line-clamp-3"
      >
        {user.username}
      </div>
    </td>

    <!-- Email -->
    <td class="px-4 py-4">
      <div
        class="text-sm font-medium text-(--color-text-primary) max-w-[40ch] line-clamp-3"
      >
        {user.email}
      </div>
    </td>

    <!-- Role -->
    <td class="px-4 py-4">
      <UserRoleBadge role={user.role}></UserRoleBadge>
    </td>

    <!-- Status -->
    <td class="px-4 py-4 text-sm text-(--color-text-secondary)">
      <span>
        {user.isBanned ? 'Banned' : 'Active'}
      </span>
    </td>

    <!-- Actions -->
    <td class="px-4 py-4 text-sm font-medium">
      {#if viewer}
        {@const actionsDisabled =
          viewer && user.role === 'ADMIN' && viewer.id !== user.id}
        <div class="flex space-x-3 flex-wrap">
          <button
            disabled={actionsDisabled}
            onclick={() => {
              userForDeletion = user;
            }}
            class="text-(--color-error) hover:text-(--color-error-muted)
           focus:outline-hidden cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Delete user"
          >
            Delete
          </button>
        </div>
      {/if}
    </td>
  </tr>

  <!-- Expandable Details Row -->
  {#if isExpanded}
    <tr
      id={`row-details-${user.id}`}
      data-testid={`row-details-${user.id}`}
      class="bg-(--color-bg-surface-hover) {disabled ? 'opacity-20' : ''}"
    >
      <td colspan={TABLE_COLUMNS.length} class="px-0 py-0 w-0 min-w-full">
        <div class="p-2" transition:slide>
          {@render RowDetails(user)}
        </div>
      </td>
    </tr>
  {/if}
{/snippet}

{#snippet RowDetails(user: UserDetail)}
  {@const actionsDisabled =
    viewer && user.role === 'ADMIN' && viewer.id !== user.id}

  <div class="space-y-4 p-4">
    <!-- Header Section -->
    <div class="flex items-start justify-between">
      <div class="space-y-1">
        <h4 class="text-lg font-semibold text-(--color-text-primary)">
          User Details
        </h4>
        <span class="text-sm text-(--color-text-tertiary)">ID: {user.id}</span>
      </div>

      {#if viewer}
        <div class="flex items-center gap-2">
          <Button
            disabled={actionsDisabled}
            onclick={() => {
              userForRoleChange = user;
            }}
            class=" text-sm font-medium
             text-(--color-text-primary) bg-(--color-bg-surface) hover:bg-(--color-bg-surface-hover)
             border border-(--color-border-emphasis) disabled:opacity-50"
          >
            Change Role
          </Button>
          <Button
            disabled={actionsDisabled}
            onclick={() => {
              userForBanning = user;
            }}
            class=" text-sm font-medium
             text-(--color-text-primary) bg-(--color-bg-surface) hover:bg-(--color-bg-surface-hover)
             border border-(--color-border-emphasis) disabled:opacity-50"
          >
            {user.isBanned ? 'Unban User' : 'Ban User'}
          </Button>
        </div>
      {/if}
    </div>

    <!-- Bio Card -->
    <div
      class="p-4 bg-(--color-bg-surface) rounded-lg border border-(--color-border-subtle)"
    >
      <h5 class="mb-2 text-sm font-semibold text-(--color-text-primary)">
        Biography
      </h5>
      {#if user.profile?.bio}
        <p class="text-md text-(--color-text-secondary) leading-relaxed">
          {user.profile.bio}
        </p>
      {:else}
        <p class="text-md text-(--color-text-tertiary) italic">
          No bio provided.
        </p>
      {/if}
    </div>

    <div
      class="flex flex-wrap gap-4 pt-4 text-sm border-t
         border-(--color-border-subtle) w-full justify-between"
    >
      <dl>
        <dt class="font-medium text-(--color-text-secondary)">First Name</dt>
        <dd class="text-(--color-text-primary)">
          {user.profile?.firstName || '—'}
        </dd>
      </dl>

      <dl>
        <dt class="font-medium text-(--color-text-secondary)">Last Name</dt>
        <dd class="text-(--color-text-primary)">
          {user.profile?.lastName || '—'}
        </dd>
      </dl>

      <div class="flex gap-4 justify-self-end">
        <a
          href={`/reports/comments?filterBy[maliciousUserId]=${user.id}`}
          class="px-3 py-1.5 flex items-center justify-between gap-1.5 text-sm
             border border-(--color-border-emphasis) rounded-md
             bg-(--color-bg-surface) hover:bg-(--color-bg-surface-hover)
             font-medium text-(--color-link)"
        >
          View Reports
          <i class="fa fa-external-link text-xs"></i>
        </a>

        <a
          href={`/posts?filterBy[userId]=${user.id}`}
          class="px-3 py-1.5 flex items-center justify-between gap-1.5 text-sm
             border border-(--color-border-emphasis) rounded-md
             bg-(--color-bg-surface) hover:bg-(--color-bg-surface-hover)
             font-medium text-(--color-link)"
        >
          View Posts
          <i class="fa fa-external-link text-xs"></i>
        </a>
      </div>
    </div>
  </div>
{/snippet}

{#snippet ControlRow()}
  <tr class="bg-(--color-bg-surface)">
    <th colspan="2"></th>
    <th class="text-xs font-medium" scope="col" colspan="2">
      <label class="sr-only" for="sort-users">Sort by:</label>
      <Select
        id="sort-users"
        class="p-2 m-2 w-max border border-(--color-border-default) rounded-md"
        value={JSON.stringify(params?.sortBy)}
        onchange={(e) => {
          const value = e.currentTarget.value;
          const userSorting = JSON.parse(value) as UserSorting;
          onParamsChange?.({ ...params, sortBy: userSorting });
        }}
        items={SORT_OPTIONS}
      ></Select>
    </th>

    <th class="text-xs font-medium" scope="col" colspan="1">
      <label class="sr-only" for="filter-users">Filter by:</label>
      <Select
        id="filter-users"
        class="p-2 m-2 w-max border border-(--color-border-default) rounded-md"
        value={JSON.stringify(params?.filterBy?.role)}
        onchange={(e) => {
          const value = e.currentTarget.value;
          const role = JSON.parse(value) as UserRole;
          onParamsChange?.({
            ...params,
            filterBy: { ...params?.filterBy, role },
          });
        }}
        items={FILTER_OPTIONS}
      ></Select>
    </th>
    <th colspan="2" align="center"> </th>
  </tr>
{/snippet}

{#if userForDeletion}
  <!-- <UserDeleteDialog bind:userForDeletion {onUserDelete}></UserDeleteDialog> -->
{:else if userForRoleChange}{:else if userForBanning}{/if}
