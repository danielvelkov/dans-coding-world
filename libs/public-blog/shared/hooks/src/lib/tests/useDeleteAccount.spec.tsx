import { renderReactQueryHook } from './helper/render-react-query-hook';
import { api } from '@dans-coding-world/public-blog-data-access-api';
import { ERROR_CODES } from '@dans-coding-world/shared-constants';
import { waitFor } from '@testing-library/dom';
import { useDeleteAccount } from '../users/useDeleteAccount';
import { generateErrorResponseByErrorCode } from '@dans-coding-world/exceptions';

vi.mock('@dans-coding-world/public-blog-data-access-api');

describe('useDeleteAccount', () => {
  const renderUseDeleteAccountHook = () =>
    renderReactQueryHook(useDeleteAccount);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test.each([
    ERROR_CODES.SERVER.INTERNAL_ERROR,
    ERROR_CODES.VALIDATION.VALIDATION_ERROR,
  ])('sets error field to the api error (%s)', async (errorCode) => {
    const errorResponse = generateErrorResponseByErrorCode(errorCode);
    vi.mocked(api.delete).mockResolvedValue(errorResponse);

    const { result } = renderUseDeleteAccountHook();

    result.current.deleteAccount(0);

    await waitFor(() => {
      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.error).toBeTruthy();
    });

    expect(result.current.error).toMatchObject(errorResponse.error);
  });
});
