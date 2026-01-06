import styled from 'styled-components';
import { PostItem } from './post-item';

export const EMPTY_POSTS_MESSAGE = 'No posts found.';

export const StyledUnorderedList = styled.ul<
  React.ComponentPropsWithoutRef<'ul'>
>`
  list-style-type: none;
  display: flex;
  flex-direction: column;
  gap: 1em;
  padding: 0em;
`;

const EmptyPostsMessage = styled.h2`
  padding: 2em;
  text-align: center;
  color: #555;
  font-weight: 500;
`;

export function PostList({
  children,
}: {
  children: React.ReactElement<typeof PostItem>[];
}) {
  if (children.length === 0)
    return <EmptyPostsMessage>{EMPTY_POSTS_MESSAGE}</EmptyPostsMessage>;
  else
    return (
      <StyledUnorderedList aria-label="blog posts">
        {children}
      </StyledUnorderedList>
    );
}
