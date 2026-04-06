import styled from 'styled-components';
import { noop } from '@tanstack/react-query';
import {
  Pagination,
  SearchBox,
} from '@dans-coding-world/public-blog-ui-common';
import {
  PAGINATION,
  POST_CONSTRAINTS,
} from '@dans-coding-world/shared-constants';
import { calculatePageOffset } from '@dans-coding-world/helpers';
import { PostList, StyledUnorderedList } from './components/PostList';
import { PostItem } from './components/PostItem';
import { ShimmerList } from './components/ShimmerList';
import {
  FetchPostsQueryParams,
  useFetchPosts,
  useDebounce,
  useAuth,
} from '@dans-coding-world/public-blog-shared-hooks';
import { useDelayedLoading } from '@dans-coding-world/public-blog-shared-helpers';
import { PostVisibilityFilter } from './components/PostVisibilityFilter';
import { PostSortingDropdown } from './components/PostSortingDropdown';
import {
  PostItemOption,
  PostItemsPerPage,
} from './components/PostItemsPerPage';
import { BlogPostItem } from './types/post-item-data.type';
import React from 'react';

const StyledFilterBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1em;
  justify-content: space-between;
  margin-bottom: 1em;

  .filter-col {
    display: flex;
    flex-direction: column;
    gap: 5px;

    label {
      font-size: small;
      font-weight: 600;
    }
  }

  .filter-col:nth-child(2) {
    margin-right: auto;
  }
`;

const StyledBlogList = styled.div<React.ComponentPropsWithoutRef<'div'>>`
  padding: 1em;
  min-height: 80vh;

  ${StyledFilterBar} {
    flex-grow: 0;
  }

  ${StyledUnorderedList} {
    flex-grow: 1;
  }
`;

export function BlogList({
  params = {},
  setParams = noop,
  className,
}: {
  params?: FetchPostsQueryParams;
  setParams?: (value: FetchPostsQueryParams) => void;
  className?: string;
}) {
  const { data, isPending, isError, error } = useFetchPosts(params);
  const { isAuthenticated } = useAuth();

  const { debounceCb: handleSearchDebounced, isPending: isLoading } =
    useDebounce((value: string) => {
      setParams({ ...params, searchQuery: value === '' ? undefined : value });
    }, 500);

  const handleTagToggle = (tagName: string) => {
    const currentTags = params.filterBy?.tags || [];
    const nextTags = currentTags.includes(tagName)
      ? currentTags.filter((t) => t !== tagName)
      : [...currentTags, tagName];
    setParams({
      ...params,
      filterBy: { ...params.filterBy, tags: nextTags },
    });
  };

  const handlePageSelect = (page: number) => {
    const pageOffset = calculatePageOffset(
      page,
      params.pageSize ?? PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE
    );
    setParams({
      ...params,
      pageOffset: pageOffset === 0 ? undefined : pageOffset,
    });
  };

  const handleItemsPerPageSelect = (itemsPerPage: PostItemOption) => {
    const normalizedValue = itemsPerPage ? Number(itemsPerPage) : undefined;
    if (
      !normalizedValue ||
      normalizedValue === PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE
    )
      setParams({
        ...params,
        pageSize: undefined,
      });
    else {
      // if page offset smaller than page size
      // or not divisible
      // round down to the closest smaller number
      const pageOffset = roundDownToMakeItDivisible(
        params.pageOffset,
        normalizedValue
      );
      setParams({
        ...params,
        pageOffset: pageOffset === 0 ? undefined : pageOffset,
        pageSize: normalizedValue as PostItemOption,
      });
    }
  };

  const showLoading = useDelayedLoading(isPending || isLoading || !data, 200);

  return (
    <StyledBlogList className={className}>
      <StyledFilterBar>
        <PostSortingDropdown
          className="filter-col"
          currentValue={params.sortBy}
          onChange={(value) =>
            setParams({
              ...params,
              sortBy: value,
            })
          }
        ></PostSortingDropdown>
        <PostVisibilityFilter
          className="filter-col"
          currentValue={params.filterBy?.visibility ?? ['PUBLIC']}
          onChange={(values) =>
            setParams({
              ...params,
              filterBy: {
                ...params.filterBy,
                visibility: values.length ? values : undefined,
              },
            })
          }
        />
        <PostItemsPerPage
          className="filter-col"
          currentValue={data?.pagination.limit}
          onChange={handleItemsPerPageSelect}
        ></PostItemsPerPage>
      </StyledFilterBar>
      <SearchBox
        currentValue={params.searchQuery ?? ''}
        onChange={handleSearchDebounced}
        maxLength={POST_CONSTRAINTS.MAX_TITLE_LENGTH}
      />

      {/* Dynamic Content Area */}
      {isError ? (
        <span
          data-testid="error-message"
          style={{ padding: '1em', color: 'red' }}
        >
          {error.message}
        </span>
      ) : showLoading ? (
        <ShimmerList count={PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE} />
      ) : (
        data && (
          <main>
            <PostList>
              {data.items.map((p) => (
                <PostItem
                  activeTags={params.filterBy?.tags}
                  key={p.id}
                  post={p as BlogPostItem}
                  isLocked={!isAuthenticated && p.visibility === 'MEMBERS_ONLY'}
                  onTagClick={handleTagToggle}
                />
              ))}
            </PostList>

            {data.pagination.totalPages > 1 && (
              <Pagination
                totalPages={data.pagination.totalPages}
                currentPage={data.pagination.page}
                onPageSelect={handlePageSelect}
              />
            )}
          </main>
        )
      )}
    </StyledBlogList>
  );
}

export default BlogList;

function roundDownToMakeItDivisible(
  value: number | undefined,
  divisor: number
) {
  if (!value || value < divisor) return 0;
  else return value - (value % divisor);
}
