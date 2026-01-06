import styled from 'styled-components';
import React, { useState } from 'react';
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
import { FetchPostsQueryParams, useFetchPosts } from './hooks/useFetchPosts';
import useDebounce from './hooks/useDebounce';

const StyledFilterBar = styled.div`
  display: flex;
  align-items: baseline;
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

const StyledShimmeringPost = styled.article<React.ComponentProps<'article'>>`
  position: relative;
  padding: 1em;
  background: #f3f3f3;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 1rem;

  .line {
    height: 20px;
    background: #e0e0e0;
    margin: 15px 0;
    border-radius: 4px;
  }

  .line:first-of-type {
    width: 40%;
  }

  .line:nth-of-type(2) {
    width: 70%;
  }

  .line:nth-of-type(3) {
    width: 90%;
  }

  .shimmer {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      rgba(255, 255, 255, 0) 0%,
      rgba(255, 255, 255, 0.6) 50%,
      rgba(255, 255, 255, 0) 100%
    );
    animation: shimmer 1.5s infinite;
  }

  @keyframes shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }
`;

type AllowedItemOptions =
  (typeof PAGINATION.POSTS.ITEMS_PER_PAGE_OPTIONS)[number];

export function BlogList({
  onAuthorClick,
}: {
  onAuthorClick: (id: number) => void;
}) {
  const [params, setParams] = useState<FetchPostsQueryParams>({});
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

const ShimmerList = ({ count }: { count: number }) => (
  <StyledUnorderedList role="status" aria-live="polite">
    <span style={{ position: 'absolute', left: '-9999px' }}>
      Loading posts…
    </span>
    <div aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <StyledShimmeringPost key={i}>
          <div className="line"></div>
          <div className="line"></div>
          <div className="line"></div>
          <div className="shimmer"></div>
        </StyledShimmeringPost>
      ))}
    </div>
  </StyledUnorderedList>
);
export default BlogList;
