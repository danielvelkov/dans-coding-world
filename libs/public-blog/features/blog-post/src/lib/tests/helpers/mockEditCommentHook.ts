import { useEditComment } from '@dans-coding-world/public-blog-shared-hooks';
import { vi } from 'vitest';

export const mockEditCommentHook = ({
  result = {},
}: {
  result?: Partial<ReturnType<typeof useEditComment>>;
}) => {
  const returnValue = {
    isSubmitting: false,
    error: null,
    editComment: vi.fn(),
    isSuccess: false,
    reset: vi.fn(),
    ...result,
  };
  vi.mocked(useEditComment).mockReturnValue(returnValue);
  return returnValue;
};
