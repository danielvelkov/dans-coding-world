import { useQuery } from '@tanstack/react-query';
import styled from 'styled-components';
import {
  Pagination,
  ItemsPerPage,
} from '@dans-coding-world/public-blog-ui-common';
import {
  GetPostsDto,
  GetPostsResponseDto,
} from '@dans-coding-world/shared-post-dto';
import { PAGINATION } from '@dans-coding-world/shared-constants';
import { PostList } from './components/post-list';
import { PostItemData } from './types/post-item-data.types';
import { PostItem } from './components/post-item';

type QueryParams = Omit<GetPostsDto, 'viewerId'>;

export const POSTS_QUERY_KEY = 'posts';

const StyledBlogListFeature = styled.div``;

export function BlogListFeature({
  fetchPostsFn,
  params,
  onAuthorClick,
  onParamsChange,
}: {
  fetchPostsFn: (params: QueryParams) => Promise<GetPostsResponseDto>;
  params: QueryParams;
  onAuthorClick: (id: number) => void;
  onParamsChange: (params: QueryParams) => void;
}) {
  const { data, error, isPending, isError } = useQuery({
    queryKey: [POSTS_QUERY_KEY, params],
    queryFn: () => fetchPostsFn(params),
  });
  const { pagination, posts } = extractPaginationAndPosts(data);

  return (
    <StyledBlogListFeature>
      <div>
      </div>
      <PostList>
        {posts.map((p) => (
          <PostItem
            key={p.id}
            post={p}
            isLocked={false}
            onAuthorClick={onAuthorClick}
            onTagClick={(tagName) =>
              onParamsChange({
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
    </StyledBlogListFeature>
  );
}

// TODO:
const extractPaginationAndPosts = (responseDto: GetPostsResponseDto) => {
  const postItemData: PostItemData[] = [];
  for (const post of responseDto.items)
    postItemData.push({
      ...post,
      publishedAt: post.publishedAt as Date,
      author: {
        id: post.authorId,
        role: 'AUTHOR',
        username: 'bababui',
        profile: {
          firstName: 'baba',
          lastName: 'bui',
          avatarURL: 'URL',
        },
      },
    });
  return { pagination: responseDto.pagination, posts: postItemData };
};
export default BlogListFeature;
