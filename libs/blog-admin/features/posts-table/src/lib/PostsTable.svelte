<script lang="ts">
  import { ADMIN_ONLY_COLUMN, TABLE_COLUMNS } from './shared.constants.js';
  import type { PostFull } from '@dans-coding-world/post-data-access';
  import { formatDateTo_DD_MM_YYYY } from '@dans-coding-world/helpers';
  import type { UserDetail } from '@dans-coding-world/user-data-access';

  export interface Props {
    posts?: PostFull[];
    isLoading?: boolean;
    error?: Error;
    viewer?: UserDetail;
  }
  const {
    posts = [],
    isLoading = false,
    error,
    viewer,
  }: Props = $props<Props>();

  const showEmptyMessage = $derived(posts.length === 0);

  const isAdmin = $derived(viewer?.role === 'ADMIN');
</script>

<table class="w-full table-auto text-left border border-gray-300">
  <thead class="border-b border-gray-200 bg-gray-50 text-gray-700">
    <tr>
      {#each TABLE_COLUMNS as col}
        {@const isAdminCol = col === ADMIN_ONLY_COLUMN}
        {#if !isAdminCol || (isAdminCol && isAdmin)}
          <th
            class={`px-4 py-3 text-sm font-semibold ${['#', 'Published/Edited Date'].includes(col) ? 'text-center' : ''}`}
            >{col}</th
          >
        {/if}
      {/each}
    </tr>
  </thead>

  <tbody class="divide-y divide-gray-200">
    {#if isLoading}
      <tr>
        <td
          colspan={TABLE_COLUMNS.length}
          class="px-4 py-6 text-center text-gray-500 italic"
        >
          Loading...
        </td>
      </tr>
    {:else if error}
      <tr>
        <td
          colspan={TABLE_COLUMNS.length}
          class="px-4 py-6 text-center text-red-500 italic"
        >
          {error}
        </td>
      </tr>
    {:else if showEmptyMessage}
      <tr>
        <td
          colspan={TABLE_COLUMNS.length}
          class="px-4 py-6 text-center text-gray-500 italic"
        >
          No posts yet - Create your first post
        </td>
      </tr>
    {:else}
      {#each posts as post, i}
        {@const isRecentlyUpdated =
          new Date(post.createdAt).getTime() !==
          new Date(post.updatedAt).getTime()}

        <tr class="transition-colors hover:bg-gray-50">
          <td class="px-4 py-3 text-sm text-gray-700 text-center">{i + 1}</td>

          <td
            class="px-4 pt-3 text-sm line-clamp-2 text-ellipsis font-medium text-gray-900"
            title={post.title}
          >
            {post.title}
          </td>

          <td class="px-4 py-3 text-sm text-gray-700">
            <div class="flex flex-col items-left gap-1">
              <b class="text-gray-900">{post.status.toUpperCase()}</b>

              {#if post.visibility === 'MEMBERS_ONLY'}
                <span class="text-xs text-gray-500">(Members-only)</span>
              {/if}
            </div>
          </td>

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
                <span class="text-xs text-gray-500"
                  >{formatDateTo_DD_MM_YYYY(new Date(post.updatedAt))}</span
                >
              {/if}
            </div>
          </td>
        </tr>
      {/each}
    {/if}
  </tbody>
</table>
