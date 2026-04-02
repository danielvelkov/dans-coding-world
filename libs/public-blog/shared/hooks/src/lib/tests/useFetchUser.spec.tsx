import { waitFor } from '@testing-library/react';
import { api } from '@dans-coding-world/public-blog-data-access-api';
import { generateMockUserResponse } from '@dans-coding-world/shared-user-testing';
import { ResponseErrorDetails } from '@dans-coding-world/api-types';
import { useFetchUser } from '../users/useFetchUser.js';
import { renderReactQueryHook } from './helper/render-react-query-hook.js';
import {
  expectApiError,
  expectNetworkError,
} from './helper/test-fetch-hook-errors.js';
import {
  ERROR_CODES,
  ERROR_HTTP_STATUS,
  ERROR_MESSAGES,
} from '@dans-coding-world/shared-constants';

const mockUserResponse = generateMockUserResponse({});
vi.mock('@dans-coding-world/shared-data-access-api');

describe('useFetchUser', () => {
  const renderUseFetchUserHook = (
    options?: Parameters<typeof useFetchUser>['1']
  ) =>
    renderReactQueryHook(() => {
      if (!mockUserResponse.data) throw new Error('Missing data');
      return useFetchUser(mockUserResponse.data.user.id, options);
    });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not query from api if enabled option is "false"', async () => {
    const { result } = renderUseFetchUserHook({ enabled: false });
    expect(result.current.isEnabled).toBe(false);
    expect(api.get).not.toHaveBeenCalled();
  });

  it('returns user details on valid response from api', async () => {
    vi.mocked(api.get).mockResolvedValue(mockUserResponse);

    const { result } = renderUseFetchUserHook();

    // wait out data fetch
    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });
    const { data } = result.current;

    if (!data) throw new Error('Testing of data fetch failed');

    expect(data.user).toBe(mockUserResponse.data?.user);
  });

  it('handles general errors', async () => {
    await expectNetworkError({
      renderHook: renderUseFetchUserHook,
      apiMock: vi.mocked(api.get),
    });
  });

  it('returns error details from API response', async () => {
    const mockResponseErrorDetails: ResponseErrorDetails = {
      message: ERROR_MESSAGES[ERROR_CODES['SERVER'].NOT_FOUND],
      status: ERROR_HTTP_STATUS[ERROR_CODES['SERVER'].NOT_FOUND],
      errorCode: ERROR_CODES['SERVER'].NOT_FOUND,
    };

    await expectApiError({
      renderHook: renderUseFetchUserHook,
      apiMock: vi.mocked(api.get),
      error: mockResponseErrorDetails,
    });
  });
});
