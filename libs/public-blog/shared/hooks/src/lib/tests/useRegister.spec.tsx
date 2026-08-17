import { renderReactQueryHook } from './helper/render-react-query-hook';
import { api } from '@dans-coding-world/public-blog-data-access-api';
import { ERROR_CODES } from '@dans-coding-world/shared-constants';
import { waitFor } from '@testing-library/dom';
import { API_ENDPOINTS } from '@dans-coding-world/shared-data-access-api';
import {
  generateMockLoginResponse,
  generateMockUserResponse,
} from '@dans-coding-world/shared-user-testing';
import { useRegister } from '../users/useRegister';
import { AuthProvider } from '../users/providers/AuthProvider';
import { generateErrorResponseByErrorCode } from '@dans-coding-world/api-exceptions';

const mockLoginResponse = generateMockLoginResponse({});
const mockUserResponse = generateMockUserResponse({
  user: mockLoginResponse.data?.user,
});

vi.mock('@dans-coding-world/public-blog-data-access-api');

describe('useRegister', () => {
  if (!mockUserResponse.data?.user) throw new Error('Missing mock user');
  const testUser = mockUserResponse.data.user;
  const userPassword = 'pa55wor1';

  const renderUseRegisterHook = () =>
    renderReactQueryHook(useRegister, ({ children }) => (
      <AuthProvider>{children}</AuthProvider>
    ));

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('on valid response from api on register, queries api with login request', async () => {
    vi.mocked(api.post).mockResolvedValue(mockUserResponse);

    const { result } = renderUseRegisterHook();

    result.current.register({
      username: testUser.username,
      email: testUser.email,
      password: userPassword,
    });

    // wait out data fetch
    await waitFor(() => {
      expect(result.current.isSubmitting).toBe(false);
    });

    expect(api.post).toHaveBeenLastCalledWith(API_ENDPOINTS.AUTH.LOGIN, {
      email: testUser.email,
      password: userPassword,
    });
  });

  test.each([
    ERROR_CODES.SERVER.INTERNAL_ERROR,
    ERROR_CODES.VALIDATION.USER_EXISTS,
  ])('sets error field to the api error (%s)', async (errorCode) => {
    const errorResponse = generateErrorResponseByErrorCode(errorCode);
    vi.mocked(api.post).mockResolvedValue(errorResponse);

    const { result } = renderUseRegisterHook();

    result.current.register({
      username: testUser.username,
      email: testUser.email,
      password: userPassword,
    });

    await waitFor(() => {
      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.error).toBeTruthy();
    });

    expect(result.current.error).toMatchObject(errorResponse.error);
  });

  it('does not try to login after failed registration', async () => {
    vi.mocked(api.post).mockRejectedValue(
      generateErrorResponseByErrorCode(ERROR_CODES.VALIDATION.USER_EXISTS),
    );

    const { result } = renderUseRegisterHook();

    result.current.register({
      username: testUser.username,
      email: testUser.email,
      password: userPassword,
    });

    // wait out data fetch
    await waitFor(() => {
      expect(result.current.isSubmitting).toBe(false);
    });

    expect(api.post).not.toHaveBeenCalledWith(API_ENDPOINTS.AUTH.LOGIN, {
      email: testUser.email,
      password: userPassword,
    });
  });
});
