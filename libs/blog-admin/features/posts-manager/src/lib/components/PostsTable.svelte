<script lang="ts">
  import { slide, fade } from 'svelte/transition';
  import DOMPurify from 'dompurify';
  import {
    ADMIN_ONLY_COLUMN,
    OMITTED_COLUMN_NAMES,
    POSTS_EMPTY_MESSAGE,
    POSTS_LOADING_MESSAGE,
    POSTS_NO_RESULTS_MESSAGE,
    SORT_OPTIONS,
    TABLE_COLUMNS,
  } from '../shared/constants.js';
  import type { PostSorting } from '../shared/constants.js';
  import type { PostFull } from '@dans-coding-world/post-data-access';
  import { POST_CONSTRAINTS } from '@dans-coding-world/shared-constants';
  import {
    formatDateTo_DD_MM_YYYY,
    toggleValue,
  } from '@dans-coding-world/helpers';
  import type { UserDetail } from '@dans-coding-world/user-data-access';
  import {
    Select,
    Table,
    Input,
    Pill,
    GenericDeleteDialog,
  } from '@dans-coding-world/blog-admin-ui-common';
  import type { PostsManagerParams } from '../types/postsManagerParams.js';
  import { debounceCallback } from '@dans-coding-world/blog-admin-data-access-operations';
  import PostsFilter from './PostsFilter.svelte';

  const blogURL = __PUBLIC_BLOG_URL__;

  interface Props {
    posts?: PostFull[];
    isLoading?: boolean;
    error?: Error;
    viewer?: Omit<UserDetail, 'password'>;
    params?: PostsManagerParams;
    onParamsChange?: (value: PostsManagerParams) => void;
    onPostDelete?: (id: number) => void;
  }

  const {
    posts = [],
    isLoading = false,
    error,
    viewer,
    params,
    onParamsChange,
    onPostDelete,
  }: Props = $props();

  let expandedRows = $state<PostFull['id'][]>([]);
  let postForDeletion: PostFull | null = $state(null);

  const showEmptyMessage = $derived(posts.length === 0);
  const isAdmin = $derived(viewer?.role === 'ADMIN');

  const handleSearchDebounced = debounceCallback(async (value: string) => {
    onParamsChange?.({
      ...params,
      searchQuery: value === '' ? undefined : value,
    });
  }, 500);
</script>

<div
  class="overflow-x-auto max-h-max min-h-fit sm:min-h-[50vh] sm:w-full w-[90vw]"
>
  <Table
    data={posts.map((post, rowIndex) => ({
      post,
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
        POSTS_LOADING_MESSAGE,
        'text-(--color-text-secondary) italic',
      )}
    {:else if error}
      {@render MessageRow(error.message, 'text-(--color-error) italic')}
    {:else if showEmptyMessage}
      {@const showNoResults = params?.searchQuery || params?.filterBy?.userId}
      {@render MessageRow(
        showNoResults ? POSTS_NO_RESULTS_MESSAGE : POSTS_EMPTY_MESSAGE,
        'text-(--color-text-secondary) italic',
      )}
    {/if}

    {#snippet row({ post, rowIndex })}
      {@render PostRow(post, rowIndex)}
    {/snippet}
  </Table>
</div>

{#snippet ColumnHeader(col: (typeof TABLE_COLUMNS)[number])}
  {@const isAdminCol = col === ADMIN_ONLY_COLUMN}
  {@const isVisible = !OMITTED_COLUMN_NAMES.includes(col)}
  {@const isCenterAligned = ['Published/Edited Date'].includes(col)}

  {#if !isAdminCol || isAdmin}
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
  {/if}
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

{#snippet PostRow(post: PostFull, rowIndex: number)}
  {@const isRecentlyUpdated =
    new Date(post.createdAt).getTime() !== new Date(post.updatedAt).getTime()}
  {@const isExpanded = expandedRows.includes(post.id)}

  <tr
    in:fade
    aria-label={`Row entry #${rowIndex + 1}`}
    class="bg-(--color-bg-surface) border-b border-(--color-border-subtle)
    hover:bg-(--color-bg-surface-hover) group transition-colors"
    aria-expanded={isExpanded}
    aria-controls={`row-details-${post.id}`}
  >
    <!-- Expand/Collapse Button -->
    <td class="px-4 py-4 text-sm text-(--color-text-secondary)">
      <button
        class="p-1 w-5 rounded hover:bg-(--color-bg-surface-active)
         text-(--color-text-secondary) focus:outline-hidden focus:ring-2
          focus:ring-(--color-accent-hover)"
        aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
        onclick={() => {
          expandedRows = toggleValue(expandedRows, post.id);
        }}
      >
        <i class={`fa fa-chevron-${isExpanded ? 'down' : 'right'}`}></i>
      </button>
    </td>

    <!-- Title -->
    <td class="px-4 py-4">
      <div
        class="text-sm font-medium text-(--color-text-primary) line-clamp-2 max-w-[40ch]"
        title={post.title}
      >
        {post.title}
      </div>
    </td>

    <!-- Status/Visibility -->
    <td class="px-4 py-4">
      <div class="flex flex-col space-y-1">
        <Pill class="text-xs font-semibold w-fit">
          {post.status.toUpperCase()}
        </Pill>
        {#if post.visibility === 'MEMBERS_ONLY'}
          <span class="text-xs text-(--color-text-tertiary)">Members-only</span>
        {/if}
      </div>
    </td>

    <!-- Published/Updated -->
    <td class="px-4 py-4 text-sm text-(--color-text-secondary)">
      <div class="flex flex-col space-y-1">
        {#if post.publishedAt}
          <time
            class="font-medium text-(--color-text-primary)"
            datetime={new Date(post.publishedAt).toISOString()}
          >
            {formatDateTo_DD_MM_YYYY(new Date(post.publishedAt))}
          </time>
          {'\n'}
        {:else}
          <span class="italic text-(--color-text-muted)">Not published</span>
        {/if}
        {#if isRecentlyUpdated}
          <span class="text-xs text-(--color-text-tertiary)">
            Updated: {formatDateTo_DD_MM_YYYY(new Date(post.updatedAt))}
          </span>
        {/if}
      </div>
    </td>

    <!-- Author (admin-only) -->
    {#if isAdmin}
      <td class="px-4 py-4 text-sm text-(--color-text-secondary)">
        <a
          href={`/users?searchQuery=${post.author.username}`}
          class="text-(--color-link) hover:text-(--color-link-hover)
           hover:underline font-medium"
        >
          {post.author.username}
        </a>
      </td>
    {/if}

    <!-- Actions -->
    <td class="px-4 py-4 text-sm font-medium">
      <div class="flex space-x-3 flex-wrap">
        <a
          href={`/posts/${post.id}/edit`}
          class="text-(--color-link) hover:text-(--color-link-hover)"
        >
          Edit
        </a>
        <button
          onclick={() => {
            postForDeletion = post;
          }}
          class="text-(--color-error) hover:text-(--color-error-muted)
           focus:outline-hidden cursor-pointer"
          aria-label="Delete post"
        >
          Delete
        </button>
      </div>
    </td>
  </tr>

  <!-- Expandable Details Row -->
  {#if isExpanded}
    <tr
      id={`row-details-${post.id}`}
      data-testid={`row-details-${post.id}`}
      class="bg-(--color-bg-surface-hover)"
    >
      <td colspan={TABLE_COLUMNS.length} class="px-0 py-0">
        <div class="p-6" transition:slide>
          {@render RowDetails(post)}
        </div>
      </td>
    </tr>
  {/if}
{/snippet}

{#snippet RowDetails(post: PostFull)}
  <div class="space-y-4">
    <!-- Header Section -->
    <div class="flex items-start justify-between">
      <div class="space-y-1">
        <h4 class="text-lg font-semibold text-(--color-text-primary)">
          Post Details
        </h4>
        <span class="text-sm text-(--color-text-tertiary)">ID: {post.id}</span>
      </div>
      <a
        href={`${blogURL}/blog/${post.id}`}
        class="inline-flex items-center gap-2 px-3 py-1.5 text-sm
         font-medium text-(--color-link) transition-colors
          border border-(--color-border-emphasis) rounded-md
           bg-(--color-bg-surface) hover:bg-(--color-bg-surface-hover)"
        target="_blank"
        rel="noopener noreferrer"
      >
        <i class="fa fa-external-link text-xs"></i>
        View Live Post
      </a>
    </div>

    <!-- Content Preview -->
    <div
      class="p-4 bg-(--color-bg-surface) rounded-lg border
       border-(--color-border-subtle)"
    >
      <h5 class="mb-2 text-sm font-semibold text-(--color-text-primary)">
        Content Preview
      </h5>
      <p class="text-(--color-text-secondary) line-clamp-2 leading-relaxed">
        {@html DOMPurify.sanitize(post.content)}
      </p>
    </div>

    <!-- Tags -->
    {#if post.tags?.length}
      <div class="flex flex-wrap gap-2">
        {#each post.tags as tag}
          <span
            class="inline-flex items-center px-2.5 py-0.5
             rounded-full text-xs font-medium bg-(--color-accent-subtle)
              text-(--color-accent) border border-(--color-border-subtle)"
          >
            #{tag}
          </span>
        {/each}
      </div>
    {/if}

    <!-- Metadata Grid -->
    <div
      class="grid grid-cols-2 gap-4 pt-4 text-sm border-t
       border-(--color-border-subtle) md:grid-cols-4"
    >
      <dl>
        <dt class="font-medium text-(--color-text-secondary)">Created</dt>
        <dd class="text-(--color-text-primary)">
          {formatDateTo_DD_MM_YYYY(new Date(post.createdAt))}
        </dd>
      </dl>
      <div>
        <dt class="font-medium text-(--color-text-secondary)">Last Modified</dt>
        <dd class="text-(--color-text-primary)">
          {formatDateTo_DD_MM_YYYY(new Date(post.updatedAt))}
        </dd>
      </div>
    </div>
  </div>
{/snippet}

{#snippet ControlRow()}
  <tr class="bg-(--color-bg-surface)">
    <th></th>
    <th class="text-xs font-medium" align="left" scope="col">
      <search>
        <label class="sr-only" for="search-posts"
          >Search by title or content:</label
        >
        <Input
          id="search-posts"
          type="text"
          placeholder="Search..."
          maxlength={POST_CONSTRAINTS.MAX_TITLE_LENGTH}
          value={params?.searchQuery ?? ''}
          oninput={(e: Event & { currentTarget: HTMLInputElement }) => {
            handleSearchDebounced(e.currentTarget.value);
          }}
        />
      </search>
    </th>
    <th class="text-xs font-medium" scope="col" align="left">
      <PostsFilter
        filters={{ ...params?.filterBy }}
        onChange={(filters) =>
          onParamsChange?.({
            ...params,
            filterBy: {
              ...params?.filterBy,
              status: filters.status,
              visibility: filters.visibility,
            },
          })}
      ></PostsFilter>
    </th>

    <th class="text-xs font-medium" scope="col">
      <label class="sr-only" for="sort-posts">Sort by:</label>
      <Select
        id="sort-posts"
        class="p-2 m-2 w-max border border-(--color-border-default) rounded-md"
        value={JSON.stringify(params?.sortBy)}
        onchange={(e) => {
          const value = e.currentTarget.value;
          const postSorting = JSON.parse(value) as PostSorting;
          onParamsChange?.({ ...params, sortBy: postSorting });
        }}
        items={SORT_OPTIONS}
      ></Select>
    </th>
    <th colspan={isAdmin ? 2 : 1}>
      <!-- Empty -->
    </th>
  </tr>
{/snippet}

{#if postForDeletion}
  <GenericDeleteDialog
    entityLabel="post"
    bind:entity={postForDeletion}
    displayKey="title"
    onDelete={onPostDelete}
  ></GenericDeleteDialog>
{/if}
