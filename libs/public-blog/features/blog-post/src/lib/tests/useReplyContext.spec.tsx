import { renderHook } from '@testing-library/react';
import { useReplyContext } from '../hooks/useReplyContext';
import { ReplyContextProvider } from '../providers/ReplyContextProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { mockCreateCommentHook } from './helpers/mockCreateCommentHook';
import { act } from 'react';

vi.mock('@dans-coding-world/public-blog-shared-hooks');

describe('useReplyContext', () => {
  const renderUseReplyContextHook = () =>
    renderHook(useReplyContext, {
      wrapper: ({ children }) => {
        const queryClient = new QueryClient();
        return (
          <QueryClientProvider client={queryClient}>
            <ReplyContextProvider postId={1}>{children}</ReplyContextProvider>
          </QueryClientProvider>
        );
      },
    });

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateCommentHook({});
  });

  it('throws an error when provider is missing', () => {
    const renderHookWithoutProvider = () => renderHook(useReplyContext);
    expect(renderHookWithoutProvider).toThrow(
      /must be used inside <ReplyContextProvider>/i
    );
  });

  it('does not call createComment() when no selectedCommentForReply is set', () => {
    const mockCreateComment = vi.fn();
    mockCreateCommentHook({
      result: { createComment: mockCreateComment },
    });
    const {
      result: {
        current: { onReplySubmit },
      },
    } = renderUseReplyContextHook();

    onReplySubmit('Awesome comment');
    expect(mockCreateComment).not.toHaveBeenCalled();
  });

  it(`calls useCreateComment hook's reset() action on setSelectedCommentForReplyId()`, () => {
    const mockReset = vi.fn();
    mockCreateCommentHook({
      result: { reset: mockReset },
    });
    const {
      result: {
        current: { setSelectedCommentForReplyId },
      },
    } = renderUseReplyContextHook();

    act(() => setSelectedCommentForReplyId(1));
    expect(mockReset).toHaveBeenCalled();
  });
});
