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
  const renderUseAuthHook = () => renderReactQueryHook(useAuthState);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns no user and "isAuthenticated" equal to false by default', () => {
    const { result } = renderUseAuthHook();

    expect(result.current.user).toBeFalsy();
    expect(result.current.isAuthenticated).toBe(false);
  });

  describe('login()', () => {
    describe('on successful login', () => {
      beforeEach(() => {
        vi.mocked(api.post).mockResolvedValue({
          error: null,
          success: true,
          data: {
            user: testUser,
          },
        });
      });

      it('sets "user" field to currently logged in user (without his password)', async () => {
        const { result } = renderUseAuthHook();
        await act(async () => {
          result.current.login({
            email: testUser.email,
            password: 'bongo',
          });
        });

        expect(result.current.user).toMatchObject(testUser);
        expect((result.current.user as any).password).toBeUndefined();
      });

      it('sets "isAuthenticated" field to true', async () => {
        const { result } = renderUseAuthHook();
        await act(async () => {
          result.current.login({
            email: testUser.email,
            password: 'bongo',
          });
        });
        expect(result.current.isAuthenticated).toBe(true);
      });

      it('changes current user if a another user has already logged in', async () => {
        const otherUser = {
          ...testUser,
          username: 'Bongo',
          email: 'Bongo@email.com',
        };
        const { result } = renderUseAuthHook();
        await act(async () => {
          result.current.login({
            email: testUser.email,
            password: 'bongo',
          });
        });
        expect(result.current.isAuthenticated).toBe(true);
        vi.mocked(api.post).mockResolvedValue({
          error: null,
          success: true,
          data: {
            user: otherUser,
          },
        });

        await act(async () => {
          result.current.login({
            email: otherUser.email,
            password: 'bongo',
          });
        });

        expect(result.current.isAuthenticated).toBe(true);
        expect(result.current.user).toMatchObject(otherUser);
      });

      it('sets up a refresh interval according to access token expiration', async () => {
        vi.useFakeTimers();

        const { result } = renderUseAuthHook();

        const apiSpy = vi.spyOn(api, 'post');

        await act(async () => {
          result.current.login({
            email: testUser.email,
            password: 'bongo',
          });
        });
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
        const { result } = renderUseAuthHook();
        await act(async () => {
          result.current.login({
            email: 'bonger@email.com',
            password: 'bonger',
          });
        });

        await waitFor(() => {
          expect(result.current.error).toMatchObject(mockError);
        });

        expect(result.current.isAuthenticated).toBe(false);
      });

      it('sets "user" field to be empty, and "isAuthenticated" to false', async () => {
        const { result } = renderUseAuthHook();
        await act(async () => {
          result.current.login({
            email: 'bonger@email.com',
            password: 'bonger',
          });
        });

        await waitFor(() => {
          expect(result.current.error).toMatchObject(mockError);
        });

        expect(result.current.user).toBeFalsy();
        expect(result.current.isAuthenticated).toBe(false);
      });

      it('does not setup interval for refreshing token', async () => {
        vi.useFakeTimers();

        const { result } = renderUseAuthHook();

        const apiSpy = vi.spyOn(api, 'post');

        await act(async () => {
          result.current.login({
            email: 'bonger@email.com',
            password: 'bonger',
          });
        });

        await act(async () => {
          vi.advanceTimersByTime(TOKEN_CONSTRAINTS.ACCESS_TOKEN_EXPIRATION * 2);
        });

        expect(apiSpy).not.toHaveBeenCalledWith(API_ENDPOINTS.AUTH.REFRESH);
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
        const { result } = renderUseAuthHook();
        await act(async () => {
          result.current.login({
            email: testUser.email,
            password: 'bongo',
          });
        });

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
        const { result } = renderUseAuthHook();
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

      const { result } = renderUseAuthHook();

      await act(async () => {
        result.current.login({
          email: testUser.email,
          password: 'bongo',
        });
      });

      expect(result.current.user).toMatchObject(testUser);

      await act(async () => {
        result.current.logout();
      });

      await act(async () => {
        vi.advanceTimersByTime(TOKEN_CONSTRAINTS.ACCESS_TOKEN_EXPIRATION * 2);
      });

      expect(apiSpy).not.toHaveBeenCalledWith(API_ENDPOINTS.AUTH.REFRESH);
      vi.useRealTimers();
    });
  });
});
