<script lang="ts">
  import type { GetUsersResponseDto } from '@dans-coding-world/shared-user-dto';
  import type { GetPostsDto } from '@dans-coding-world/shared-post-dto';
  import {
    type CreateInfiniteQueryResult,
    type InfiniteData,
  } from '@tanstack/svelte-query';
  import { DropdownSearch } from '@dans-coding-world/blog-admin-ui-common';

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
</script>

<DropdownSearch
  bind:lastOptionRef={lastOption}
  placeHolder="Filter by author..."
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
  selected={selectedAuthor != undefined
    ? { value: selectedAuthor.toString() }
    : selectedAuthor}
></DropdownSearch>
