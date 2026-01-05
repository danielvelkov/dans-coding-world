import styled from 'styled-components';
import { useState } from 'react';
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

// TODO: does not look good
const StyledShimmeringPost = styled.article`
  position: relative;
  box-sizing: border-box;
  padding: 0.5em 1em;
  border: 2px solid #ddd;

  .line {
    width: 100%;
    height: 20px;
    background: #bbb;
    margin: 20px 0;
    border-radius: 5px;
  }

  .shimmer {
    position: absolute;
    top: 0;
    left: 0;
    width: 50%;
    height: 100%;

    background: linear-gradient(
      100deg,
      rgba(255, 255, 255, 0) 20%,
      rgba(255, 255, 255, 0.5) 50%,
      rgba(255, 255, 255, 0) 80%
    );

    animation: shimmer 2s infinite linear;
  }

  @keyframes shimmer {
    from {
      transform: translateX(-200%);
    }
    to {
      transform: translateX(200%);
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
        <PostItemShimmerComponent></PostItemShimmerComponent>
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
            isLocked={false}
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

// TODO:
const PostItemShimmerComponent = () => (
  <StyledShimmeringPost>
    <div className="line"></div>
    <div className="line"></div>
    <div className="line"></div>
    <div className="shimmer"></div>
  </StyledShimmeringPost>
);

export default BlogList;
