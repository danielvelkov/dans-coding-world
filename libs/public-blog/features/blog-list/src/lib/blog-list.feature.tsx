import styled from 'styled-components';
import { useState } from 'react';
import {
  Pagination,
  ItemsPerPage,
} from '@dans-coding-world/public-blog-ui-common';
import {
  PAGINATION,
  calculatePageOffset,
} from '@dans-coding-world/shared-constants';
import { PostList } from './components/post-list';
import { PostItem } from './components/post-item';
import { FetchPostsQueryParams, useFetchPosts } from './hooks/useFetchPosts';

const StyledBlogListFeature = styled.div``;

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
        onPageSelect={(page) =>
          setParams({
            ...params,
            pageOffset: calculatePageOffset(page, params.pageOffset),
          })
        }
      ></Pagination>
    </StyledBlogListFeature>
  );
}

// TODO:
const PostItemShimmerComponent = () => <div></div>;

export default BlogList;
