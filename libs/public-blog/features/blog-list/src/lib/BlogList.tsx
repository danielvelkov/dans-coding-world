import styled from 'styled-components';
import { noop } from '@tanstack/react-query';
import {
  Pagination,
  SearchBox,
} from '@dans-coding-world/public-blog-ui-common';
import {
  PAGINATION,
  VALIDATION_MESSAGES,
} from '@dans-coding-world/shared-constants';
import { calculatePageOffset } from '@dans-coding-world/helpers';
import { PostList, StyledUnorderedList } from './components/PostList';
import { PostItem } from './components/PostItem';
import { ShimmerList } from './components/ShimmerList';
import {
  FetchPostsQueryParams,
  useFetchPosts,
  useDebounce,
} from '@dans-coding-world/public-blog-shared-hooks';
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

const StyledBlogListFeature = styled.div<React.ComponentPropsWithoutRef<'div'>>`
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
    setParams({
      ...params,
      pageSize:
        normalizedValue === PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE
          ? undefined
          : (normalizedValue as PostItemOption),
    });
  };

  const showLoading = isPending || isLoading || !data;

  return (
    <StyledBlogListFeature className={className}>
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
        <main>
          <PostList>
            {data.items.map((p) => (
              <PostItem
                activeTags={params.filterBy?.tags}
                key={p.id}
                post={p as BlogPostItem}
                isLocked={p.content === VALIDATION_MESSAGES.posts.membersOnly}
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
      )}
    </StyledBlogListFeature>
  );
}

export default BlogList;
