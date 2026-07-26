<script lang="ts">
  import type { GetUsersResponseDto } from '@dans-coding-world/shared-user-dto';
  import type { GetPostsDto } from '@dans-coding-world/shared-post-dto';
  import {
    type CreateInfiniteQueryResult,
    type InfiniteData,
  } from '@tanstack/svelte-query';
  import { DropdownSearch } from '@dans-coding-world/blog-admin-ui-common';
  import { USER_CONSTRAINTS } from '@dans-coding-world/shared-constants';

  type QueryData = Pick<
    CreateInfiniteQueryResult<InfiniteData<GetUsersResponseDto | null>, Error>,
    'data' | 'error' | 'hasNextPage' | 'isLoading' | 'isFetchingNextPage'
  >;

  interface Props {
    filters: Pick<NonNullable<GetPostsDto['filterBy']>, 'userId'>;
    onChange: (filters: Props['filters']) => void;
    queryData: QueryData;
    loadNext: () => void;
    handleSearch: (val: string) => void;
    isSearching?: boolean;
  }

  let observer: IntersectionObserver;
  let searchInput = $state('');
  let lastOption: Element | null = $state(null);

  const {
    filters,
    onChange,
    queryData,
    loadNext,
    handleSearch,
    isSearching,
  }: Props = $props();

  const selectedAuthor = $derived(filters?.userId);

  const items = $derived(
    queryData.data?.pages.flatMap((val) => val?.items ?? []) ?? [],
  );

  const activeUser = $derived(items.find((u) => u.id === selectedAuthor));

  const hasMore = $derived(queryData.hasNextPage);
  const isLoading = $derived(queryData.isLoading);
  const error = $derived(queryData?.error);
  const isFetchingNextPage = $derived(queryData?.isFetchingNextPage);

  $effect(() => {
    if (!lastOption) return;
    if (observer) observer.disconnect();

    observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !isFetchingNextPage) {
        loadNext();
      }
    });

    observer.observe(lastOption);
    return () => observer.disconnect();
  });

  function clearAuthorFilter() {
    searchInput = '';
    onChange({ ...filters, userId: undefined });
  }
</script>

<div class="flex flex-col space-y-2 w-full">
  <DropdownSearch
    bind:lastOptionRef={lastOption}
    placeHolder="Filter by author..."
    searchInputMaxLength={USER_CONSTRAINTS.MAX_USERNAME_LENGTH}
    options={items.map((u) => ({ label: u.username, value: u.id.toString() }))}
    error={error?.message ?? undefined}
    isLoadingOptions={isLoading}
    {isSearching}
    {handleSearch}
    {searchInput}
    handleSelect={(id) => {
      const user = items.find((u) => u.id === +id);
      if (!user) return;
      searchInput = user.username;
      onChange({ ...filters, userId: +id });
    }}
    selected={selectedAuthor !== undefined
      ? [{ value: selectedAuthor.toString() }]
      : selectedAuthor}
  ></DropdownSearch>

  {#if selectedAuthor}
    <div
      class="flex items-center gap-2 mt-1.5 text-xs text-(--color-text-secondary)"
    >
      <span>Filtering by:</span>
      <div
        class="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-0.5 font-medium rounded-md bg-(--color-accent-subtle) text-(--color-accent) border border-(--color-border-subtle)"
      >
        <span class="max-w-30 truncate">
          {activeUser?.username ?? `User #${selectedAuthor}`}
        </span>
        <button
          type="button"
          onclick={clearAuthorFilter}
          class="p-0.5 rounded-sm hover:bg-(--color-bg-surface-active) text-(--color-accent) transition-colors focus:outline-hidden"
          title="Clear author filter"
          aria-label="Clear filter"
        >
          <i class="fa fa-times text-[10px]"></i>
        </button>
      </div>
    </div>
  {/if}
</div>
