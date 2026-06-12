<script lang="ts">
  import { slide } from 'svelte/transition';
  import {
    ADMIN_ONLY_COLUMN,
    OMITTED_COLUMN_NAMES,
    POSTS_EMPTY_MESSAGE,
    POSTS_LOADING_MESSAGE,
    SORT_OPTIONS,
    TABLE_COLUMNS,
  } from '../shared/constants.js';
  import type { PostSorting } from '../shared/constants.js';
  import type { PostFull } from '@dans-coding-world/post-data-access';
  import {
    formatDateTo_DD_MM_YYYY,
    toggleValue,
  } from '@dans-coding-world/helpers';
  import type { UserDetail } from '@dans-coding-world/user-data-access';
    Select,
    Table,
  } from '@dans-coding-world/blog-admin-ui-common';
  import type { PostsManagerParams } from '../types/postsManagerParams.js';

  interface Props {
    posts?: PostFull[];
    isLoading?: boolean;
    error?: Error;
    viewer?: UserDetail;
    params?: PostsManagerParams;
    onParamsChange?: (value: PostsManagerParams) => void;
  }

  const {
    posts = [],
    isLoading = false,
    error,
    viewer,
    params,
    onParamsChange,
  }: Props = $props();

  let expandedRows = $state<PostFull['id'][]>([]);

  const showEmptyMessage = $derived(posts.length === 0);
  const isAdmin = $derived(viewer?.role === 'ADMIN');
</script>

<Table data={posts.map((post, rowIndex) => ({ post, rowIndex }))}>
  {#snippet header()}
    <tr>
      {#each TABLE_COLUMNS as col}
        {@render ColumnHeader(col)}
      {/each}
    </tr>

    {@render ControlRow()}
  {/snippet}

  {#if isLoading}
    {@render MessageRow(POSTS_LOADING_MESSAGE, 'text-gray-500 italic')}
  {:else if error}
    {@render MessageRow(error.message, 'text-red-500 italic')}
  {:else if showEmptyMessage}
    {@render MessageRow(POSTS_EMPTY_MESSAGE, 'text-gray-500 italic')}
  {/if}

  {#snippet row({ post, rowIndex })}
    {@render PostRow(post, rowIndex)}
  {/snippet}
</Table>

{#snippet ColumnHeader(col: (typeof TABLE_COLUMNS)[number])}
  {@const isAdminCol = col === ADMIN_ONLY_COLUMN}
  {@const isVisible = !OMITTED_COLUMN_NAMES.includes(col)}
  {@const isCenterAligned = ['#', 'Published/Edited Date'].includes(col)}

  {#if !isAdminCol || isAdmin}
    <th
      class={`px-6 py-4 text-xs font-medium tracking-wider text-gray-500 uppercase border-b border-gray-200 bg-gray-200 ${
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
  <tr class="bg-white">
    <td
      colspan={TABLE_COLUMNS.length}
      class="px-4 py-12 text-center border-b border-gray-200"
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
    class=" bg-white border-b border-gray-200 hover:bg-gray-50 group"
    aria-expanded={isExpanded}
    aria-controls={`row-details-${post.id}`}
  >
    <!-- Expand/Collapse Button -->
    <td class="px-4 py-4 text-sm text-gray-500">
      <button
        class="p-1 w-5 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
        onclick={() => {
          expandedRows = toggleValue(expandedRows, post.id);
        }}
      >
        <i class={`fa fa-chevron-${isExpanded ? 'down' : 'right'}`}></i>
      </button>
    </td>

    <!-- Index -->
    <td class="px-4 py-4 text-sm text-center text-gray-500">
      {rowIndex + 1}
    </td>

    <!-- Title -->
    <td class="px-4 py-4">
      <div
        class="text-sm font-medium text-gray-900 line-clamp-2"
        title={post.title}
      >
        {post.title}
      </div>
    </td>

    <!-- Status/Visibility -->
    <td class="px-4 py-4">
      <div class="flex flex-col space-y-1">
        <span
          class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 w-fit"
        >
          {post.status.toUpperCase()}
        </span>
        {#if post.visibility === 'MEMBERS_ONLY'}
          <span class="text-xs text-gray-500">Members-only</span>
        {/if}
      </div>
    </td>

    <!-- Published/Updated -->
    <td class="px-4 py-4 text-sm text-gray-500">
      <div class="flex flex-col space-y-1">
        {#if post.publishedAt}
          <time
            class="font-medium text-gray-700"
            datetime={new Date(post.publishedAt).toISOString()}
          >
            {formatDateTo_DD_MM_YYYY(new Date(post.publishedAt))}
          </time>
        {:else}
          <span class="italic text-gray-400">Not published</span>
        {/if}
        {#if isRecentlyUpdated}
          <span class="text-xs text-gray-400">
            Updated: {formatDateTo_DD_MM_YYYY(new Date(post.updatedAt))}
          </span>
        {/if}
      </div>
    </td>

    <!-- Author (admin-only) -->
    {#if isAdmin}
      <td class="px-4 py-4 text-sm text-gray-500">
        <a
          href={`/users?search=${post.authorId}`}
          class="text-blue-600 hover:text-blue-800 hover:underline"
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
          class="text-blue-600 hover:text-blue-800"
        >
          Edit
        </a>
        <button
          class="text-red-600 hover:text-red-800 focus:outline-none"
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
      class="bg-gray-50"
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
        <h4 class="text-lg font-semibold text-gray-900">Post Details</h4>
        <span class="text-sm text-gray-500">ID: {post.id}</span>
      </div>
      <a
        href={`[PUBLIC_BLOG_URL]/posts/${post.id}`}
        class="inline-flex items-center gap-2 px-3 py-1 text-sm font-medium text-blue-600 transition-colors border border-blue-600 rounded-md hover:bg-blue-50"
        target="_blank"
        rel="noopener noreferrer"
      >
        <i class="fa fa-external-link"></i>
        View Live Post
      </a>
    </div>

    <!-- Author Info -->
    {#if isAdmin}
      <div class="p-4 bg-white rounded-lg border border-gray-200">
        <h5 class="mb-2 text-sm font-semibold text-gray-700">
          Author Information
        </h5>
        <div class="space-y-1 text-sm text-gray-600">
          <span class="font-medium">Username:</span>
          {post.author.username}
        </div>
      </div>
    {/if}

    <!-- Content Preview -->
    <div class="p-4 bg-white rounded-lg border border-gray-200">
      <h5 class="mb-2 text-sm font-semibold text-gray-700">Content Preview</h5>
      <p class="text-gray-600 line-clamp-2">{post.content}</p>
    </div>

    <!-- Tags -->
    {#if post.tags?.length}
      <div class="flex flex-wrap gap-2">
        {#each post.tags as tag}
          <span
            class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
          >
            #{tag}
          </span>
        {/each}
      </div>
    {/if}

    <!-- Metadata Grid -->
    <div
      class="grid grid-cols-2 gap-4 pt-4 text-sm border-t border-gray-200 md:grid-cols-4"
    >
      <dl>
        <dt class="font-medium text-gray-500">Created</dt>
        <dd class="text-gray-900">
          {formatDateTo_DD_MM_YYYY(new Date(post.createdAt))}
        </dd>
      </dl>
      <div>
        <dt class="font-medium text-gray-500">Last Modified</dt>
        <dd class="text-gray-900">
          {formatDateTo_DD_MM_YYYY(new Date(post.updatedAt))}
        </dd>
      </div>
    </div>
  </div>
{/snippet}

{#snippet ControlRow()}
  <tr class="bg-gray-50">
    <th class="text-xs font-medium" scope="col"></th>
    <th class="text-xs font-medium m-2" scope="col" colspan="2">
      <!-- TODO -->
      <input class="p-2 border border-gray-300" placeholder="Search..." />
    </th>
    <th class="text-xs font-medium" scope="col">
      <!-- TODO -->
    </th>

    <th class="text-xs font-medium" scope="col">
      <label class="sr-only" for="sort-by">Sort by:</label>
      <Select
        id="sort-by"
        class="p-2 m-2 w-30 border border-gray-300"
        value={JSON.stringify(params?.sortBy)}
        onchange={(e) => {
          const value = e.currentTarget.value;
          const postSorting = JSON.parse(value) as PostSorting;
          onParamsChange?.({ ...params, sortBy: postSorting });
        }}
        items={SORT_OPTIONS}
      ></Select>
    </th>
  </tr>
{/snippet}
