import styled from 'styled-components';
import { useState } from 'react';
import {
  Pagination,
  ItemsPerPage,
  SearchBox,
} from '@dans-coding-world/public-blog-ui-common';
import {
  PAGINATION,
  VALIDATION_MESSAGES,
} from '@dans-coding-world/shared-constants';
import { calculatePageOffset } from '@dans-coding-world/helpers';
import { PostList, StyledUnorderedList } from './components/post-list';
import { PostItem } from './components/post-item';
import { ShimmerList } from './components/shimmer-list';
import { FetchPostsQueryParams, useFetchPosts } from './hooks/useFetchPosts';
import useDebounce from './hooks/useDebounce';
import { VisibilityFilter } from './components/visibility-filter';
import { SortingDropdown } from './components/sorting-dropdown';

const StyledFilterBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1em;
`;

const StyledBlogListFeature = styled.div`
  padding: 1em;
  min-height: 80vh;
  display: flex;
  flex-direction: column;

  ${StyledFilterBar} {
    flex-grow: 0;
  }

  ${StyledUnorderedList} {
    flex-grow: 1;
  }
`;

type AllowedItemOptions =
  (typeof PAGINATION.POSTS.ITEMS_PER_PAGE_OPTIONS)[number];

export function BlogList({
  onAuthorClick,
}: {
  onAuthorClick: (id: number) => void;
}) {
  const [params, setParams] = useState<FetchPostsQueryParams>({
    filterBy: {
      status: ['PUBLISHED'],
    },
    sortBy: {
      publishedAt: 'desc',
    },
  });
  const { data, isPending, isError, error } = useFetchPosts(params);

  const { debounceCb: handleSearchDebounced, isPending: isLoading } =
    useDebounce((value: string) => {
      setParams({ ...params, searchQuery: value === '' ? undefined : value });
    }, 500);

  const showLoading = isPending || isLoading || !data;

  return (
    <StyledBlogListFeature>
      <StyledFilterBar>
        <SearchBox
          currentValue={params.searchQuery ?? ''}
          onChange={(searchString) => handleSearchDebounced(searchString)}
        />
        <VisibilityFilter
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
        <SortingDropdown
          onChange={(value) =>
            setParams({
              ...params,
              sortBy: value ? { ...value } : undefined,
            })
          }
        ></SortingDropdown>
        <ItemsPerPage
          values={PAGINATION.POSTS.ITEMS_PER_PAGE_OPTIONS}
          currentValue={
            (data?.pagination.limit as AllowedItemOptions) ??
            PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE
          }
          onItemSelect={(itemsPerPage) =>
            setParams({
              ...params,
              pageSize:
                +itemsPerPage === PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE
                  ? undefined
                  : itemsPerPage,
            })
          }
        />
      </StyledFilterBar>

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
        <>
          <PostList>
            {data.posts.map((p) => (
              <PostItem
                key={p.id}
                post={p}
                isLocked={p.content === VALIDATION_MESSAGES.posts.membersOnly}
                onAuthorClick={onAuthorClick}
                onTagClick={(tagName) =>
                  setParams({
                    ...params,
                    filterBy: {
                      ...params.filterBy,
                      tags: [...(params.filterBy?.tags ?? []), tagName],
                    },
                  })
                }
              />
            ))}
          </PostList>

          <Pagination
            totalPages={data.pagination.totalPages}
            currentPage={data.pagination.page}
            onPageSelect={(page) => {
              const pageOffset = calculatePageOffset(
                page,
                params.pageSize ?? PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE
              );
              setParams({
                ...params,
                pageOffset: pageOffset === 0 ? undefined : pageOffset,
              });
            }}
          />
        </>
      )}
    </StyledBlogListFeature>
  );
}

export default BlogList;
