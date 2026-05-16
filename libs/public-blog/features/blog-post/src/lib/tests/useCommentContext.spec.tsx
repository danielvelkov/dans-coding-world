import { renderHook } from '@testing-library/react';
import { useCommentContext } from '../hooks/useCommentContext';
import { CommentContextProvider } from '../providers/CommentContextProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { mockCreateCommentHook } from './helpers/mockCreateCommentHook';
import { mockEditCommentHook } from './helpers/mockEditCommentHook';
import { act } from 'react';

vi.mock('@dans-coding-world/public-blog-shared-hooks');

describe('useCommentContext', () => {
  const renderUseCommentContextHook = () =>
    renderHook(useCommentContext, {
      wrapper: ({ children }) => {
        const queryClient = new QueryClient();
        return (
          <QueryClientProvider client={queryClient}>
            <CommentContextProvider postId={1}>
              {children}
            </CommentContextProvider>
          </QueryClientProvider>
        );
      },
    });

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateCommentHook({});
    mockEditCommentHook({});
  });

  it('throws an error when provider is missing', () => {
    const renderHookWithoutProvider = () => renderHook(useCommentContext);
    expect(renderHookWithoutProvider).toThrow(
      /must be used inside <CommentContextProvider>/i
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
    } = renderUseCommentContextHook();

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
    } = renderUseCommentContextHook();

    act(() => setSelectedCommentForReplyId(1));
    expect(mockReset).toHaveBeenCalled();
  });

  it('does not call editComment() when no selectedCommentForEdit is set', () => {
    const mockEditComment = vi.fn();
    mockEditCommentHook({
      result: { editComment: mockEditComment },
    });
    const {
      result: {
        current: { onEditSubmit },
      },
    } = renderUseCommentContextHook();

    onEditSubmit('Awesome comment');
    expect(mockEditComment).not.toHaveBeenCalled();
  });

  it(`calls useEditComment hook's reset() action on setSelectedCommentForEditId()
    and set selectedCommentForReply to null`, () => {
    const mockReset = vi.fn();
    mockEditCommentHook({
      result: { reset: mockReset },
    });
    const {
      result: {
        current: { setSelectedCommentForEditId },
      },
    } = renderUseCommentContextHook();

    act(() => setSelectedCommentForEditId(1));
    expect(mockReset).toHaveBeenCalled();
  });
});
