import styled from 'styled-components';
import { PostItemData } from '../types/post-item-data.types';
import { PostItem } from './post-item';

export const EMPTY_POSTS_MESSAGE = 'No posts found.';

const StyledUnorderedList = styled.ul`
  list-style-type: none;
`;

export function PostList({ posts }: { posts: PostItemData[] }) {
  if (posts.length === 0) return <p>{EMPTY_POSTS_MESSAGE}</p>;
  else
    return (
      <StyledUnorderedList>
        {posts.map((p) => (
          <PostItem
            post={p}
            key={p.id}
            onAuthorClick={(id) => console.log(id)}
            onTagClick={(tagName) => console.log(tagName)}
            isLocked={false}
          ></PostItem>
        ))}
      </StyledUnorderedList>
    );
}
