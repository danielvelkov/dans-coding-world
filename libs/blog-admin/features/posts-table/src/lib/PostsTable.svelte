<script lang="ts">
  import {
    ADMIN_ONLY_COLUMN,
    POSTS_EMPTY_MESSAGE,
    POSTS_LOADING_MESSAGE,
    TABLE_COLUMNS,
  } from './shared.constants.js';
  import type { PostFull } from '@dans-coding-world/post-data-access';
  import { formatDateTo_DD_MM_YYYY } from '@dans-coding-world/helpers';
  import type { UserDetail } from '@dans-coding-world/user-data-access';
  import { Table } from '@dans-coding-world/blog-admin-ui-common';

  interface Props {
    posts?: PostFull[];
    isLoading?: boolean;
    error?: Error;
    viewer?: UserDetail;
  }

  interface RowDetails {
    post: PostFull;
    rowIndex: number;
  }

  const { posts = [], isLoading = false, error, viewer }: Props = $props();

  const showEmptyMessage = $derived(posts.length === 0);
  const isAdmin = $derived(viewer?.role === 'ADMIN');
</script>

<Table data={posts.map((post, rowIndex) => ({ post, rowIndex }) as RowDetails)}>
  <!-- Table columns -->
  {#snippet header()}
    {#each TABLE_COLUMNS as col}
      {@render ColumnHeader(col)}
    {/each}
  {/snippet}

  <!-- children() -->
  {#if isLoading}
    {@render MessageRow(POSTS_LOADING_MESSAGE, 'text-gray-500 italic')}
  {:else if error}
    {@render MessageRow(error.message, 'text-red-500 italic')}
  {:else if showEmptyMessage}
    {@render MessageRow(POSTS_EMPTY_MESSAGE, 'text-gray-500 italic')}
  {/if}

  <!-- Table Rows -->
  {#snippet row({ post, rowIndex })}
    {@render PostRow(post, rowIndex)}
  {/snippet}
</Table>

{#snippet ColumnHeader(col: string)}
  {@const isAdminCol = col === ADMIN_ONLY_COLUMN}

  {#if !isAdminCol || isAdmin}
    <th
      class={`px-4 py-3 text-sm font-semibold ${
        ['#', 'Published/Edited Date'].includes(col) ? 'text-center' : ''
      }`}
    >
      {col}
    </th>
  {/if}
{/snippet}

{#snippet MessageRow(message: string, classOverride: string)}
  <tr>
    <td
      colspan={TABLE_COLUMNS.length}
      class={`px-4 py-6 text-center ${classOverride}`}
    >
      {message}
    </td>
  </tr>
{/snippet}

{#snippet PostRow(post: PostFull, rowIndex: number)}
  {@const isRecentlyUpdated =
    new Date(post.createdAt).getTime() !== new Date(post.updatedAt).getTime()}

  <tr class="transition-colors hover:bg-gray-50">
    <!-- Index -->
    <td class="px-4 py-3 text-sm text-gray-700 text-center">{rowIndex + 1}</td>

    <!-- Title -->
    <td
      class="px-4 pt-3 text-sm line-clamp-2 text-ellipsis font-medium text-gray-900"
      title={post.title}
    >
      {post.title}
    </td>

    <!-- Status/Visibility -->
    <td class="px-4 py-3 text-sm text-gray-700">
      <div class="flex flex-col items-left gap-1">
        <b class="text-gray-900">{post.status.toUpperCase()}</b>

        {#if post.visibility === 'MEMBERS_ONLY'}
          <span class="text-xs text-gray-500">(Members-only)</span>
        {/if}
      </div>
    </td>

    <!-- Published/Updated -->
    <td class="px-4 py-3 text-sm text-gray-700">
      <div class="flex flex-col items-center gap-1">
        {#if post.publishedAt}
          <time
            datetime={new Date(post.publishedAt).toISOString()}
            class="text-gray-900"
          >
            {formatDateTo_DD_MM_YYYY(new Date(post.publishedAt))}
          </time>
        {:else}
          <span class="text-gray-400">-</span>
        {/if}

        {#if isRecentlyUpdated}
          <span class="text-xs text-gray-500">
            {formatDateTo_DD_MM_YYYY(new Date(post.updatedAt))}
          </span>
        {/if}
      </div>
    </td>

    <!-- Author (admin-only) -->
    {#if isAdmin}
      <td class="px-4 py-3 text-sm text-gray-700">
        <a href={`/users?search=${post.authorId}`}>
          <b class="text-gray-900 hover:underline">{post.author.username}</b>
        </a>
      </td>
    {/if}

    <!-- Actions -->
    <td class="px-4 py-3 text-sm text-gray-700">
      <div class="flex flex-wrap gap-3">
        <a href={`/posts/${post.id}/edit`}>Edit</a>
        <button>Delete</button>
      </div>
    </td>
  </tr>
{/snippet}
