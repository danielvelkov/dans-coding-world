import { renderReactQueryHook } from './helper/render-react-query-hook';
import { api } from '@dans-coding-world/public-blog-data-access-api';
import { ERROR_CODES } from '@dans-coding-world/shared-constants';
import { waitFor } from '@testing-library/dom';
import { useEditComment } from '../posts/useEditComment';
import { generateErrorResponseByErrorCode } from '@dans-coding-world/exceptions';
import { QueryClient } from '@tanstack/react-query';
import { AuthProvider } from '../users/providers/AuthProvider';
import { generateMockCommentResponse } from '@dans-coding-world/shared-post-testing';

vi.mock('@dans-coding-world/public-blog-data-access-api');

describe('useEditComment', () => {
  const renderUseEditCommentHook = (queryClient?: QueryClient) =>
    renderReactQueryHook(
      useEditComment,
      ({ children }) => <AuthProvider>{children}</AuthProvider>,
      queryClient,
    );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it(`on valid response from api it calls QueryClient's invalidateQueries()`, async () => {
    const testId = 999;
    const queryClient = new QueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const mockCommentResponse = generateMockCommentResponse({ postId: testId });
    vi.mocked(api.patch).mockResolvedValue(mockCommentResponse);
    const { result } = renderUseEditCommentHook(queryClient);

    result.current.editComment({
      commentId: mockCommentResponse.data.comment.id,
      postId: testId,
      content: 'Super awesome comment',
    });

    // wait out data fetch
    await waitFor(() => {
      expect(result.current.isSubmitting).toBe(false);
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
    vi.mocked(api.patch).mockResolvedValue(errorResponse);

    const { result } = renderUseEditCommentHook();

    result.current.editComment({
      commentId: 1,
      postId: 1,
      content: 'Super awesome comment',
    });

    await waitFor(() => {
      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.error).toBeTruthy();
    });

    expect(result.current.error).toMatchObject(errorResponse.error);
  });

  it('does not call invalidateQueries after failed comment creation', async () => {
    const testId = 999;
    vi.mocked(api.patch).mockRejectedValue(
      generateErrorResponseByErrorCode(ERROR_CODES.VALIDATION.VALIDATION_ERROR),
    );

    const queryClient = new QueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderUseEditCommentHook(queryClient);

    result.current.editComment({
      commentId: 1,
      postId: 1,
      content: 'Super awesome comment',
    });

    // wait out data fetch
    await waitFor(() => {
      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.error).toBeTruthy();
    });
    expect(invalidateQueriesSpy).not.toHaveBeenCalledWith({
      queryKey: ['post-comments', { postId: testId }],
    });
  });
});
