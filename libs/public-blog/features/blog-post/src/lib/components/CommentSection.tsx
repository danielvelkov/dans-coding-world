import {
  useAuth,
  useCreateComment,
  useFetchPostCommentsInfinite,
} from '@dans-coding-world/public-blog-shared-hooks';
import styled from 'styled-components';
import {
  COMMENT_CONSTRAINTS,
  PAGINATION,
} from '@dans-coding-world/shared-constants';
import CommentThread from './CommentThread';
import { ShimmerComments } from './ShimmerComments';
import { Dropdown, Button } from '@dans-coding-world/public-blog-ui-common';
import { useState } from 'react';
import { FieldErrorText } from '@dans-coding-world/public-blog-ui-form';
import CommentForm from './CommentForm';
import { ReplyContextProvider } from '../providers/ReplyContextProvider';

type AllowedPageSizes =
  (typeof PAGINATION.COMMENTS.ITEMS_PER_PAGE_OPTIONS)[number];

type SortOrder = 'desc' | 'asc';

const LOADED_COMMENTS_PER_INCREMENT: AllowedPageSizes = 10;

const StyledLoadMoreButton = styled(Button)`
  font-weight: bold;
  display: block;
  width: 100%;
  max-width: 70%;
  margin: 2em auto;
  color: ${({ theme }) => theme.text.primary};
  background-color: ${({ theme }) => theme.background.elevated};
`;

const StyledCommentSection = styled.section`
  border-top: 1px solid ${({ theme }) => theme.text.muted};
  padding-bottom: 3em;
`;

const StyledSectionMeta = styled.div`
  padding-top: 1em;
  display: flex;
  justify-content: space-between;
  align-items: baseline;

  h3 {
    margin: 0;
  }

  .comment-section-options {
    display: flex;
    gap: 5px;
    align-items: center;
  }
`;
const BannedMessage = styled.div`
  padding: 2em 5em;
  text-align: center;

  i {
    font-size: 2em;
    display: inline-flex;
    align-items: center;
    justify-content: center;

    width: 1em;
    height: 1em;
    border-radius: 50%;
    background: ${({ theme }) => theme.background.inverse};
    box-shadow: -5px 5px 8px ${({ theme }) => theme.background.inverse};
  }
`;

export function CommentSection({ postId }: { postId: number }) {
  const { isAuthenticated, user } = useAuth();
  const {
    createComment,
    isSubmitting: isCreatingComment,
    error: commentingError,
    isSuccess: commentPosted,
  } = useCreateComment();
  const [commentSortOrder, setCommentSortOrder] = useState<SortOrder>('desc');

  const { data, isPending, isError, error, isFetchingNextPage, fetchNextPage } =
    useFetchPostCommentsInfinite({
      sortBy: {
        createdAt: commentSortOrder,
      },
      postId,
      pageSize: LOADED_COMMENTS_PER_INCREMENT,
      depth: COMMENT_CONSTRAINTS.MAX_REPLY_TREE_DEPTH,
    });

  const showLoading = isPending || !data;

  if (showLoading || isError)
    return isError ? (
      <FieldErrorText>
        <span data-testid="error-message">{error.message}</span>
      </FieldErrorText>
    ) : (
      <ShimmerComments count={3} />
    );

  const comments = data.pages
    .map((page) => page?.items)
    .flat()
    .filter((c) => c !== undefined);

  const lastPaginationDetails = data.pages[data.pages.length - 1]?.pagination;

  return (
    <StyledCommentSection>
      <StyledSectionMeta>
        <h3>Comments ({lastPaginationDetails?.total ?? 0}):</h3>
        <div className="comment-section-options">
          <label htmlFor="sort">
            <i className="fas fa-sort" aria-hidden="true"></i>
            <span className="sr-only">Sort comments</span>
          </label>
          <Dropdown
            id="sort"
            values={[
              {
                label: 'Most recent',
                value: 'desc',
              },
              {
                label: 'Oldest first',
                value: 'asc',
              },
            ]}
            currentValue={commentSortOrder}
            onItemSelect={(val) => setCommentSortOrder(val as SortOrder)}
          ></Dropdown>
        </div>
      </StyledSectionMeta>

      {isAuthenticated && user?.isBanned ? (
        <BannedMessage>
          <i className="fa fa-ban"></i>
          <h3>You are banned</h3>
          <p>
            You are unable to comment or reply until a moderator unbans you.
          </p>
        </BannedMessage>
      ) : (
        <>
          <CommentForm
            isLocked={!isAuthenticated}
            onSubmit={(val) => {
              createComment({ postId: postId, content: val });
            }}
            isSubmitting={isCreatingComment}
            resetValue={commentPosted ? '' : undefined}
          ></CommentForm>
          {commentingError && (
            <FieldErrorText>
              <span data-testid="error-message">{commentingError.message}</span>
            </FieldErrorText>
          )}
        </>
      )}

      <ReplyContextProvider postId={postId}>
        <CommentThread comments={comments}></CommentThread>
      </ReplyContextProvider>

      {!isFetchingNextPage && lastPaginationDetails?.hasNext && (
        <StyledLoadMoreButton onClick={() => fetchNextPage()}>
          Load more
        </StyledLoadMoreButton>
      )}
    </StyledCommentSection>
  );
}

export default CommentSection;
