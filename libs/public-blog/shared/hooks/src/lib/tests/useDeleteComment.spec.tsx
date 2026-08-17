import { renderReactQueryHook } from './helper/render-react-query-hook';
import { api } from '@dans-coding-world/public-blog-data-access-api';
import { ERROR_CODES } from '@dans-coding-world/shared-constants';
import { waitFor } from '@testing-library/dom';
import { useDeleteComment } from '../posts/useDeleteComment';
import { generateErrorResponseByErrorCode } from '@dans-coding-world/api-exceptions';
import { QueryClient } from '@tanstack/react-query';
import { AuthProvider } from '../users/providers/AuthProvider';
import { generateMockCommentResponse } from '@dans-coding-world/shared-post-testing';

vi.mock('@dans-coding-world/public-blog-data-access-api');

describe('useDeleteComment', () => {
  const renderUseDeleteCommentHook = (queryClient?: QueryClient) =>
    renderReactQueryHook(
      useDeleteComment,
      ({ children }) => <AuthProvider>{children}</AuthProvider>,
      queryClient,
    );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
  const testId = 999;
  const mockCommentResponse = generateMockCommentResponse({ postId: testId });

  it(`on valid response from api it calls QueryClient's invalidateQueries()`, async () => {
    const queryClient = new QueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    vi.mocked(api.delete).mockResolvedValue(mockCommentResponse);
    const { result } = renderUseDeleteCommentHook(queryClient);

    result.current.deleteComment({
      postId: testId,
      commentId: mockCommentResponse.data.comment.id,
      authorId: 1,
    });

    // wait out data fetch
    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: [
          'post-comments',
          expect.objectContaining({ postId: testId }),
        ],
        exact: false,
      }),
    );
  });

  test.each([
    ERROR_CODES.SERVER.INTERNAL_ERROR,
    ERROR_CODES.VALIDATION.VALIDATION_ERROR,
  ])('sets error field to the api error (%s)', async (errorCode) => {
    const errorResponse = generateErrorResponseByErrorCode(errorCode);
    vi.mocked(api.delete).mockResolvedValue(errorResponse);

    const { result } = renderUseDeleteCommentHook();

    result.current.deleteComment({
      postId: testId,
      commentId: mockCommentResponse.data.comment.id,
      authorId: 1,
    });

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
      expect(result.current.error).toBeTruthy();
    });

    expect(result.current.error).toMatchObject(errorResponse.error);
  });

  it('does not call invalidateQueries after failed comment creation', async () => {
    const testId = 999;
    vi.mocked(api.delete).mockRejectedValue(
      generateErrorResponseByErrorCode(
        ERROR_CODES.VALIDATION.MAX_REPLY_DEPTH_REACHED,
      ),
    );

    const queryClient = new QueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderUseDeleteCommentHook(queryClient);

    result.current.deleteComment({
      postId: testId,
      commentId: mockCommentResponse.data.comment.id,
      authorId: 1,
    });

    // wait out data fetch
    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
      expect(result.current.error).toBeTruthy();
    });
    expect(invalidateQueriesSpy).not.toHaveBeenCalledWith({
      queryKey: ['post-comments', { postId: testId }],
    });
  });
});
