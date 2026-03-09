import { useFetchPostCommentsInfinite } from '@dans-coding-world/public-blog-shared-hooks';
import styled from 'styled-components';
import { PAGINATION } from '@dans-coding-world/shared-constants';
import CommentTree from './CommentTree';

type AllowedPageSizes =
  (typeof PAGINATION.COMMENTS.ITEMS_PER_PAGE_OPTIONS)[number];

const LOADED_COMMENTS_PER_INCREMENT: AllowedPageSizes = 10;

const StyledCommentSection = styled.section`
  border-top: 2px solid ${({ theme }) => theme.text.muted};
  padding-bottom: 3em;
`;

const StyledButton = styled.button<React.ComponentPropsWithoutRef<'button'>>`
  font-weight: 500;
  font-family: inherit;
  display: block;
  border-radius: 6px;
  font-size: 1.1em;
  padding: 0.5em 1.75em;
  margin: 2em auto;
  color: ${({ theme }) => theme.background.surface};
  box-shadow: 1px 1px ${({ theme }) => theme.accent.soft};
  border-color: ${({ theme }) => theme.border.primary};
  background: ${({ theme }) => theme.accent.primary};

  &:hover {
    background-color: ${({ theme }) => theme.accent.hover};
  }
`;

export function CommentSection({ postId }: { postId: number }) {
  const { data, isPending, isError, error, isFetchingNextPage, fetchNextPage } =
    useFetchPostCommentsInfinite({
      postId,
      pageSize: LOADED_COMMENTS_PER_INCREMENT,
      depth: 3,
    });
  const showLoading = isPending || !data;

  if (showLoading || isError)
    return (
      <div>
        {isError ? (
          <span
            data-testid="error-message"
            style={{ padding: '1em', color: 'red' }}
          >
            {error.message}
          </span>
        ) : (
          <span>Loading</span>
        )}
      </div>
    );

  const comments = data.pages
    .map((page) => page?.items)
    .flat()
    .filter((c) => c !== undefined);

  const lastPaginationDetails = data.pages[data.pages.length - 1]?.pagination;

  return (
    <StyledCommentSection>
      <h3>Comments ({lastPaginationDetails?.total ?? 0}):</h3>

      <CommentTree comments={comments}></CommentTree>

      {!isFetchingNextPage && lastPaginationDetails?.hasNext && (
        <StyledButton onClick={() => fetchNextPage()}>Load more</StyledButton>
      )}
    </StyledCommentSection>
  );
}

export default CommentSection;
