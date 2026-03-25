import { renderReactQueryHook } from './helper/render-react-query-hook';
import useAuth from '../users/useAuth.js';
import { api } from '@dans-coding-world/public-blog-data-access-api';
import { act } from 'react';
import { ResponseErrorDetails } from '@dans-coding-world/api-types';
import {
  ERROR_CODES,
  ERROR_HTTP_STATUS,
  ERROR_MESSAGES,
} from '@dans-coding-world/shared-constants';
import { waitFor } from '@testing-library/dom';

vi.mock('@dans-coding-world/shared-data-access-api');

describe('useAuth', () => {
  const renderUseAuthHook = () => renderReactQueryHook(useAuth);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns no user and "isAuthenticated" equal to false by default', () => {
    const { result } = renderUseAuthHook();

    expect(result.current.user).toBeFalsy();
    expect(result.current.isAuthenticated).toBe(false);
  });

  describe('login()', () => {
    describe('on successful login', () => {
      const testUser = {
        id: 1,
        email: 'Bingo@mail.com',
        username: 'Bingo',
        isBanned: false,
        role: 'ADMIN',
      };

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
    });
  });
});
