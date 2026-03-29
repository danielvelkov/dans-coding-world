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

vi.mock('@dans-coding-world/shared-data-access-api');

describe('useAuthState', () => {
  const testUser = {
    id: 1,
    email: 'Bingo@mail.com',
    username: 'Bingo',
    isBanned: false,
    role: 'ADMIN',
  };
  const renderUseAuthStateHook = () => renderReactQueryHook(useAuthState);

  beforeEach(() => {
    vi.clearAllMocks();
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

  it('sets user and "isAuthenticated" to true on mount if refresh response is valid', async () => {
    // clear the rejected once just for this test
    vi.mocked(api.post).mockReset();
    vi.mocked(api.post).mockResolvedValueOnce({
      error: null,
      success: true,
      data: { user: testUser },
    });

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
        vi.mocked(api.post).mockResolvedValueOnce({
          error: null,
          success: true,
          data: {
            user: testUser,
          },
        });
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
          error: null,
          success: true,
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
    describe('on successful logout', () => {
      beforeEach(() => {
        vi.mocked(api.post).mockResolvedValueOnce({
          error: null,
          success: true,
          data: {
            user: testUser,
          },
        });
        vi.mocked(api.post).mockResolvedValueOnce({
          error: null,
          success: true,
          data: {
            message: 'Logged out',
          },
        });
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
      const mockError: ResponseErrorDetails = {
        status: ERROR_HTTP_STATUS[ERROR_CODES.AUTH.UNAUTHORIZED],
        errorCode: ERROR_CODES.AUTH.UNAUTHORIZED,
        message: ERROR_MESSAGES[ERROR_CODES.AUTH.UNAUTHORIZED],
      };
      beforeEach(() => {
        vi.mocked(api.post).mockResolvedValueOnce({
          error: mockError,
          success: false,
          data: null,
        });
      });

      it('sets error field to the api error', async () => {
        const result = await renderAndAwaitEffects();
        result.current.logout();

        await waitFor(() => {
          expect(result.current.isLoading).toBeFalsy();
        });
        expect(result.current.error).toMatchObject(mockError);
      });
    });

    it(`clears set interval for the refreshing of the user's token`, async () => {
      vi.mocked(api.post).mockResolvedValueOnce({
        error: null,
        success: true,
        data: {
          user: testUser,
        },
      });
      vi.mocked(api.post).mockResolvedValueOnce({
        error: null,
        success: true,
        data: {
          message: 'Logged out',
        },
      });
      vi.useFakeTimers();
      const apiSpy = vi.spyOn(api, 'post');

      const result = await renderAndAwaitEffects();

      await loginAs(result);

      expect(result.current.user).toMatchObject(testUser);

      await act(async () => {
        result.current.logout();
      });

      await act(async () => {
        vi.advanceTimersByTime(TOKEN_CONSTRAINTS.ACCESS_TOKEN_EXPIRATION * 2);
      });

      expect(apiSpy).not.toHaveBeenLastCalledWith(API_ENDPOINTS.AUTH.REFRESH);
      vi.useRealTimers();
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
