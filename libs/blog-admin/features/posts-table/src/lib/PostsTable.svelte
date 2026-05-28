<script lang="ts">
  import { TABLE_COLUMNS } from './shared.constants.js';
  import type { PostFull } from '@dans-coding-world/post-data-access';
  import { formatDateTo_DD_MM_YYYY } from '@dans-coding-world/helpers';

  interface Props {
    posts: PostFull[];
  }
  let { posts = [] }: Props = $props();

  const showEmptyMessage = $derived(posts.length === 0);
</script>

<table class="w-full table-auto border-collapse text-left">
  <thead class="border-b border-gray-200 bg-gray-50 text-gray-700">
    <tr>
      {#each TABLE_COLUMNS as col}
        <th class="px-4 py-3 text-sm font-semibold">{col}</th>
      {/each}
    </tr>
  </thead>

  <tbody class="divide-y divide-gray-200">
    {#if showEmptyMessage}
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
          <td class="px-4 py-3 text-sm text-gray-700">{i + 1}</td>

          <td class="px-4 py-3 text-sm font-medium text-gray-900">
            {post.title}
          </td>

          <td class="px-4 py-3 text-sm text-gray-700">
            <div class="flex items-center gap-1">
              <b class="text-gray-900">{post.status.toUpperCase()}</b>

              {#if post.visibility === 'MEMBERS_ONLY'}
                <span class="text-xs text-gray-500">(Members-only)</span>
              {/if}
            </div>
          </td>

          <td class="px-4 py-3 text-sm text-gray-700">
            <div class="flex items-center gap-1">
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
