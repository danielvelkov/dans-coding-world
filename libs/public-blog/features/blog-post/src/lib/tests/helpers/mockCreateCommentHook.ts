import { useCreateComment } from '@dans-coding-world/public-blog-shared-hooks';
import { vi } from 'vitest';

export const mockCreateCommentHook = ({
  result = {},
}: {
  result?: Partial<ReturnType<typeof useCreateComment>>;
}) => {
  const returnValue = {
    isSubmitting: false,
    error: null,
    createComment: vi.fn(),
    isSuccess: false,
    reset: vi.fn(),
    ...result,
  };
  vi.mocked(useCreateComment).mockReturnValue(returnValue);
  return returnValue;
};
