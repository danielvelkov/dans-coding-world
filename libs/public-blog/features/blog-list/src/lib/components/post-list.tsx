import styled from 'styled-components';
import { PostItem } from './post-item';

export const EMPTY_POSTS_MESSAGE = 'No posts found.';

const StyledUnorderedList = styled.ul<React.ComponentPropsWithoutRef<'ul'>>`
  list-style-type: none;
  display: flex;
  flex-direction: column;
  gap: 1em;
  padding: 0em 1em;
`;

export function PostList({
  children,
}: {
  children: React.ReactElement<typeof PostItem>[];
}) {
  if (children.length === 0) return <p>{EMPTY_POSTS_MESSAGE}</p>;
  else
    return (
      <StyledUnorderedList aria-label="blog posts">
        {children}
      </StyledUnorderedList>
    );
}
