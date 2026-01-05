import styled from 'styled-components';
import React, { useState } from 'react';
import {
  Pagination,
  ItemsPerPage,
} from '@dans-coding-world/public-blog-ui-common';
import {
  PAGINATION,
  VALIDATION_MESSAGES,
} from '@dans-coding-world/shared-constants';
import { calculatePageOffset } from '@dans-coding-world/helpers';
import { PostList } from './components/post-list';
import { PostItem } from './components/post-item';
import { FetchPostsQueryParams, useFetchPosts } from './hooks/useFetchPosts';

const StyledBlogListFeature = styled.div``;

const StyledShimmeringPost = styled.article<
  React.ComponentPropsWithoutRef<'article'>
>`
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

  if (isError)
    return (
      <StyledBlogListFeature>
        <span data-testid="error-message">{error.message}</span>
      </StyledBlogListFeature>
    );

  if (isPending || !data)
    return (
      <StyledBlogListFeature>
        <ShimmerList
          count={PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE}
        ></ShimmerList>
      </StyledBlogListFeature>
    );

  const { pagination, posts } = data;

  return (
    <StyledBlogListFeature>
      <div>
        <ItemsPerPage
          values={PAGINATION.POSTS.ITEMS_PER_PAGE_OPTIONS}
          currentValue={
            (pagination.limit as AllowedItemOptions) ??
            PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE
          }
          onItemSelect={(itemsPerPage) =>
            setParams({ ...params, pageSize: itemsPerPage })
          }
        ></ItemsPerPage>
      </div>
      <PostList>
        {posts.map((p) => (
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
          ></PostItem>
        ))}
      </PostList>
      <Pagination
        totalPages={pagination.totalPages}
        currentPage={pagination.page}
        onPageSelect={(page) => {
          const pageOffset = calculatePageOffset(
            page,
            params.pageOffset ?? PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE
          );
          setParams({
            ...params,
            pageOffset: pageOffset === 0 ? undefined : pageOffset,
          });
        }}
      ></Pagination>
    </StyledBlogListFeature>
  );
}

const ShimmerList = ({ count }: { count: number }) => (
  <div style={{ padding: '1em' }}>
    {Array.from({ length: count }).map((_, i) => (
      <StyledShimmeringPost key={i}>
        <div className="line"></div>
        <div className="line"></div>
        <div className="line"></div>
        <div className="shimmer"></div>
      </StyledShimmeringPost>
    ))}
  </div>
);

export default BlogList;
