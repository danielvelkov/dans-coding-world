import { renderReactQueryHook } from './helper/render-react-query-hook';
import { api } from '@dans-coding-world/public-blog-data-access-api';
import { ERROR_CODES } from '@dans-coding-world/shared-constants';
import { waitFor } from '@testing-library/dom';
import {
  generateMockLoginResponse,
  generateMockUserResponse,
} from '@dans-coding-world/shared-user-testing';
import { useUpdateProfile } from '../users/useUpdateProfile';
import { AuthProvider } from '../users/providers/AuthProvider';
import { generateErrorResponseByErrorCode } from '@dans-coding-world/exceptions';
import { QueryClient } from '@tanstack/react-query';

const mockLoginResponse = generateMockLoginResponse({});
const mockUserResponse = generateMockUserResponse({
  user: mockLoginResponse.data?.user,
});

vi.mock('@dans-coding-world/public-blog-data-access-api');

describe('useUpdateProfile', () => {
  if (!mockUserResponse.data?.user) throw new Error('Missing mock user');
  const testUser = mockUserResponse.data.user;

  if (!testUser.profile) throw new Error('Missing profile details');

  const renderUseUpdateHook = (queryClient?: QueryClient) =>
    renderReactQueryHook(
      useUpdateProfile,
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
    const queryClient = new QueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    vi.mocked(api.patch).mockResolvedValue(mockUserResponse);

    const { result } = renderUseUpdateHook(queryClient);

    result.current.updateProfile({
      userId: testUser.id,
      ...testUser.profile,
    });

    // wait out data fetch
    await waitFor(() => {
      expect(result.current.isSubmitting).toBe(false);
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['user', testUser.id],
    });
  });

  test.each([
    ERROR_CODES.SERVER.INTERNAL_ERROR,
    ERROR_CODES.VALIDATION.VALIDATION_ERROR,
  ])('sets error field to the api error (%s)', async (errorCode) => {
    const errorResponse = generateErrorResponseByErrorCode(errorCode);
    vi.mocked(api.patch).mockResolvedValue(errorResponse);

    const { result } = renderUseUpdateHook();

    result.current.updateProfile({
      userId: testUser.id,
      ...testUser.profile,
    });

    await waitFor(() => {
      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.error).toBeTruthy();
    });

    expect(result.current.error).toMatchObject(errorResponse.error);
  });

  it('does not call invalidateQueries after failed update', async () => {
    vi.mocked(api.patch).mockRejectedValue(
      generateErrorResponseByErrorCode(ERROR_CODES.VALIDATION.USER_EXISTS),
    );

    const queryClient = new QueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderUseUpdateHook(queryClient);

    result.current.updateProfile({
      userId: testUser.id,
      ...testUser.profile,
    });

    // wait out data fetch
    await waitFor(() => {
      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.error).toBeTruthy();
    });
    expect(invalidateQueriesSpy).not.toHaveBeenCalledWith({
      queryKey: ['user', testUser.id],
    });
  });
});
