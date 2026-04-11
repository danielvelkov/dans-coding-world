import { renderReactQueryHook } from './helper/render-react-query-hook';
import { useAuthState } from '../users/useAuthState.js';
import { api } from '@dans-coding-world/public-blog-data-access-api';
import { act } from 'react';
import { ResponseErrorDetails } from '@dans-coding-world/api-types';
import {
  ERROR_CODES,
  ERROR_HTTP_STATUS,
  ERROR_MESSAGES,
  TOKEN_CONSTRAINTS,
} from '@dans-coding-world/shared-constants';
import { waitFor } from '@testing-library/dom';
import { API_ENDPOINTS } from '@dans-coding-world/shared-data-access-api';
import {
  generateMockLoginResponse,
  generateMockUserResponse,
} from '@dans-coding-world/shared-user-testing';
import { UserDetail } from '@dans-coding-world/user-data-access';

const mockLoginResponse = generateMockLoginResponse({});
const mockLogoutResponse = {
  error: null,
  success: true,
  data: {
    message: 'Logged out',
  },
};

vi.mock('@dans-coding-world/shared-data-access-api');

describe('useAuthState', () => {
  if (!mockLoginResponse.data?.user) throw new Error('Missing mock user');
  const testUser = mockLoginResponse.data.user;

  const renderUseAuthStateHook = () => renderReactQueryHook(useAuthState);

  beforeEach(() => {
    vi.clearAllMocks();
    // mock useAuthState refreshMutation query call
    vi.mocked(api.post).mockRejectedValueOnce({
      error: {
        status: ERROR_HTTP_STATUS[ERROR_CODES.AUTH.INVALID_TOKEN],
        errorCode: ERROR_CODES.AUTH.INVALID_TOKEN,
        message: ERROR_MESSAGES[ERROR_CODES.AUTH.INVALID_TOKEN],
      },
      success: false,
      data: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sets user and "isAuthenticated" to true, on hook start if refresh response is valid', async () => {
    // clear the rejected once just for this test
    vi.mocked(api.post).mockReset();
    vi.mocked(api.post).mockResolvedValueOnce(mockLoginResponse);

    const result = await renderAndAwaitEffects();

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(API_ENDPOINTS.AUTH.REFRESH);
    });

    expect(result.current.user).toBe(testUser);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('returns no user and "isAuthenticated" equal to false by default', () => {
    const { result } = renderUseAuthStateHook();

    expect(result.current.user).toBeFalsy();
    expect(result.current.isAuthenticated).toBe(false);
  });

  describe('login()', () => {
    describe('on successful login', () => {
      beforeEach(() => {
        vi.mocked(api.post).mockResolvedValueOnce(mockLoginResponse);
      });

      it('sets "user" field to currently logged in user (without his password)', async () => {
        const result = await renderAndAwaitEffects();

        await loginAs(result);

        expect(result.current.user).toMatchObject(testUser);
        expect((result.current.user as any).password).toBeUndefined();
      });

      it('sets "isAuthenticated" field to true', async () => {
        const result = await renderAndAwaitEffects();

        await loginAs(result);
        expect(result.current.isAuthenticated).toBe(true);
      });

      it('changes current user if a another user has already logged in', async () => {
        const otherUser = {
          ...testUser,
          username: 'Bongo',
          email: 'Bongo@email.com',
        };
        const result = await renderAndAwaitEffects();

        await loginAs(result);

        expect(result.current.isAuthenticated).toBe(true);
        vi.mocked(api.post).mockResolvedValueOnce({
          ...mockLoginResponse,
          data: {
            user: otherUser,
          },
        });

        await loginAs(result, otherUser);

        expect(result.current.isAuthenticated).toBe(true);
        expect(result.current.user).toMatchObject(otherUser);
      });

      it('sets up a refresh interval according to access token expiration', async () => {
        vi.useFakeTimers();

        const result = await renderAndAwaitEffects();

        const apiSpy = vi.spyOn(api, 'post');

        await loginAs(result);

        expect(result.current.isAuthenticated).toBe(true);

        await act(async () => {
          vi.advanceTimersByTime(TOKEN_CONSTRAINTS.ACCESS_TOKEN_EXPIRATION + 1);
        });

        expect(apiSpy).toHaveBeenCalledWith(API_ENDPOINTS.AUTH.REFRESH);
        vi.useRealTimers();
      });

      it('fetches full user profile data after login', async () => {
        const mockUserResponse = generateMockUserResponse({ user: testUser });
        vi.mocked(api.get).mockResolvedValueOnce(mockUserResponse);

        const result = await renderAndAwaitEffects();
        await act(async () => {
          await loginAs(result);
        });

        expect(result.current.isAuthenticated).toBe(true);
        expect(result.current.user).not.toHaveProperty('profile');
        await waitFor(() => {
          expect(result.current.user).toHaveProperty('profile');
        });
        expect((result.current.user as UserDetail).profile).toBe(
          mockUserResponse.data?.user.profile
        );
      });
    });

    describe('on unsuccessful login', () => {
      const mockError: ResponseErrorDetails = {
        status: ERROR_HTTP_STATUS[ERROR_CODES.AUTH.INVALID_PASSWORD],
        errorCode: ERROR_CODES.AUTH.INVALID_PASSWORD,
        message: ERROR_MESSAGES[ERROR_CODES.AUTH.INVALID_PASSWORD],
      };

      beforeEach(() => {
        vi.mocked(api.post).mockResolvedValue({
          error: mockError,
          success: false,
          data: null,
        });
      });

      it('sets "error" field to the api error response', async () => {
        const result = await renderAndAwaitEffects();
        await loginAs(result);

        await waitFor(() => {
          expect(result.current.error).toMatchObject(mockError);
        });

        expect(result.current.isAuthenticated).toBe(false);
      });

      it('sets "user" field to be empty, and "isAuthenticated" to false', async () => {
        const result = await renderAndAwaitEffects();
        await loginAs(result);

        await waitFor(() => {
          expect(result.current.error).toMatchObject(mockError);
        });

        expect(result.current.user).toBeFalsy();
        expect(result.current.isAuthenticated).toBe(false);
      });

      it('does not setup interval for refreshing token', async () => {
        vi.useFakeTimers();
        const apiSpy = vi.spyOn(api, 'post');

        const result = await renderAndAwaitEffects();

        await loginAs(result);

        await act(async () => {
          vi.advanceTimersByTime(TOKEN_CONSTRAINTS.ACCESS_TOKEN_EXPIRATION * 2);
        });

        expect(apiSpy).not.toHaveBeenLastCalledWith(API_ENDPOINTS.AUTH.REFRESH);
        vi.useRealTimers();
      });
    });
  });

  describe('logout()', () => {
    const unauthorizedError: ResponseErrorDetails = {
      status: ERROR_HTTP_STATUS[ERROR_CODES.AUTH.UNAUTHORIZED],
      errorCode: ERROR_CODES.AUTH.UNAUTHORIZED,
      message: ERROR_MESSAGES[ERROR_CODES.AUTH.UNAUTHORIZED],
    };

    const serverError: ResponseErrorDetails = {
      status: ERROR_HTTP_STATUS[ERROR_CODES.SERVER.INTERNAL_ERROR],
      errorCode: ERROR_CODES.SERVER.INTERNAL_ERROR,
      message: ERROR_MESSAGES[ERROR_CODES.SERVER.INTERNAL_ERROR],
    };

    describe('on successful logout', () => {
      beforeEach(() => {
        vi.mocked(api.post).mockResolvedValueOnce(mockLoginResponse);
        vi.mocked(api.post).mockResolvedValueOnce(mockLogoutResponse);
      });

      it('sets user to null and "isAuthenticated" to false', async () => {
        const result = await renderAndAwaitEffects();

        await loginAs(result);

        expect(result.current.user).toMatchObject(testUser);
        result.current.logout();

        await waitFor(() => {
          expect(result.current.isLoading).toBeFalsy();
        });
        expect(result.current.user).toBeFalsy();
        expect(result.current.isAuthenticated).toBe(false);
      });
    });

    describe('on unsuccessful logout', () => {
      const mockLogoutError = (error: ResponseErrorDetails) => {
        // TODO: maybe its better to have api query funcs so you can mock like this:
        // vi.mocked(blog.login)...
        // vi.mocked(blog.logout)...

        // mock Login response
        vi.mocked(api.post).mockResolvedValueOnce(mockLoginResponse);
        // mock Logout response
        vi.mocked(api.post).mockResolvedValueOnce({
          error,
          success: false,
          data: null,
        });
      };

      test.each([serverError, unauthorizedError])(
        'sets error field to the api error',
        async (error) => {
          mockLogoutError(error);
          const result = await renderAndAwaitEffects();

          await loginAs(result);
          expect(result.current.user).toMatchObject(testUser);

          result.current.logout();

          await waitFor(() => {
            expect(result.current.isLoading).toBeFalsy();
          });
          expect(result.current.error).toMatchObject(error);
        }
      );

      it('keeps user if error is anything but 401-Unauthorized', async () => {
        mockLogoutError(serverError);
        const result = await renderAndAwaitEffects();

        await loginAs(result);
        expect(result.current.user).toMatchObject(testUser);

        result.current.logout();

        await waitFor(() => {
          expect(result.current.isLoading).toBeFalsy();
        });

        expect(result.current.error).toMatchObject(serverError);
        expect(result.current.user).toMatchObject(testUser);
      });

      it('clears user if error is 401-Unauthorized', async () => {
        mockLogoutError(unauthorizedError);
        const result = await renderAndAwaitEffects();
        await loginAs(result);

        expect(result.current.user).toMatchObject(testUser);
        result.current.logout();

        await waitFor(() => {
          expect(result.current.isLoading).toBeFalsy();
          expect(result.current.error).toMatchObject(unauthorizedError);
        });
        expect(result.current.user).toBeFalsy();
      });
    });

    describe('in any case', () => {
      test.each([
        ['successful logout', mockLogoutResponse],
        [
          'unsuccessful logout',
          {
            data: null,
            success: false,
            error: unauthorizedError,
          },
        ],
      ])(
        `clears set interval for the refreshing of the user's token (%s)`,
        async (_, mockLogoutResponse) => {
          vi.mocked(api.post).mockResolvedValueOnce(mockLoginResponse);
          vi.mocked(api.post).mockResolvedValueOnce(mockLogoutResponse);
          vi.useFakeTimers();
          const apiSpy = vi.spyOn(api, 'post');

          const result = await renderAndAwaitEffects();

          await loginAs(result);

          expect(result.current.user).toMatchObject(testUser);

          await act(async () => {
            result.current.logout();
          });

          await act(async () => {
            vi.advanceTimersByTime(
              TOKEN_CONSTRAINTS.ACCESS_TOKEN_EXPIRATION * 2
            );
          });

          expect(apiSpy).not.toHaveBeenLastCalledWith(
            API_ENDPOINTS.AUTH.REFRESH
          );
          vi.useRealTimers();
        }
      );
    });
  });

  async function loginAs(result: any, user = testUser) {
    await act(async () => {
      result.current.login({ email: user.email, password: 'bongo' });
    });
  }

  /**
   * Render useAuthState hook and wait out useEffect hooks with act()
   * @returns Hook result
   */
  async function renderAndAwaitEffects() {
    return await act(async () => {
      const { result } = renderUseAuthStateHook();
      return result;
    });
  }
});
