import { render } from 'vitest-browser-svelte';
import { expect, describe } from 'vitest';
import { QueryClient } from '@tanstack/svelte-query';
import { AuthStateManager } from './auth.state.svelte.js';
import Wrapper from './Wrapper.test.svelte';
import { api } from '@dans-coding-world/public-blog-data-access-api';
import { BaseResponse, ErrorResponse } from '@dans-coding-world/api-types';
import { generateMockLoginResponse } from '@dans-coding-world/shared-user-testing';
import { generateErrorResponseByErrorCode } from '@dans-coding-world/api-exceptions';
import {
  ERROR_CODES,
  TOKEN_CONSTRAINTS,
} from '@dans-coding-world/shared-constants';
import { API_ENDPOINTS } from '@dans-coding-world/shared-data-access-api';

vi.mock('@dans-coding-world/public-blog-data-access-api', async () => {
  return {
    api: {
      post: vi.fn(),
    },
  };
});

async function setup() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: {
        enabled: true,
      },
    },
  });
  let manager!: AuthStateManager;
  let resolveReady!: () => void;
  const readyPromise = new Promise<void>((resolve) => {
    resolveReady = resolve;
  });

  await render(Wrapper, {
    props: {
      queryClient,
      onReady: () => {
        manager = new AuthStateManager();
        resolveReady();
      },
    },
  });

  await readyPromise;

  return { manager, queryClient };
}

describe('AuthStateManger', () => {
  const mockLoginResponse = generateMockLoginResponse({});
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('init()', () => {
    describe('tries to refresh user session on calling', () => {
      test('sets user and isAuthenticated if successful refresh', async () => {
        vi.mocked(api.post<BaseResponse>).mockResolvedValue(mockLoginResponse);
        const mockedUser = mockLoginResponse.data?.user;
        if (!mockedUser) throw new Error('Missing test user');

        const { manager } = await setup();
        expect(manager.user).toEqual(null);
        manager.init();

        expect(manager.authBootstrapPending).toBe(true);

        await vi.waitFor(() => {
          expect(manager.authBootstrapPending).toBe(false);
        });

        expect(manager.user).toEqual(mockedUser);
        expect(manager.isAuthenticated).toBe(true);
      });

      test('sets user to null and isAuthenticated to false on failed refresh', async () => {
        vi.mocked(api.post<ErrorResponse>).mockResolvedValue(
          generateErrorResponseByErrorCode(ERROR_CODES.AUTH.INVALID_TOKEN),
        );

        const { manager } = await setup();
        manager.init();
        expect(manager.authBootstrapPending).toBe(true);

        await vi.waitFor(() => {
          expect(manager.authBootstrapPending).toBe(false);
        });

        expect(manager.user).toBeNull();
        expect(manager.isAuthenticated).toBe(false);
      });
    });

    describe('sets up refresh interval', () => {
      test('on successful refresh, sets an interval that refreshes on token expiry', async () => {
        vi.useFakeTimers();
        let refreshCounter = 0;
        vi.mocked(api.post<BaseResponse>).mockImplementation(() => {
          refreshCounter++;
          return Promise.resolve(mockLoginResponse);
        });

        const { manager } = await setup();
        expect(manager.user).toBeNull();
        manager.init();

        expect(manager.authBootstrapPending).toBe(true);

        await vi.waitFor(() => {
          expect(manager.authBootstrapPending).toBe(false);
        });
        expect(manager.user).not.toBeNull();
        expect(refreshCounter).toBe(1);

        const intervalsToPass = 3;
        await vi.advanceTimersByTimeAsync(
          TOKEN_CONSTRAINTS.ACCESS_TOKEN_EXPIRATION * intervalsToPass,
        );
        expect(refreshCounter).toBe(intervalsToPass + 1);
        vi.useRealTimers();
      });
    });

    test('if refresh fails at some point, user is set to null and the interval is cleared', async () => {
      vi.useFakeTimers();
      let refreshCounter = 0;
      const failOnAttempt = 2;
      vi.mocked(api.post<BaseResponse>).mockImplementation(() => {
        refreshCounter++;
        if (refreshCounter === failOnAttempt)
          return Promise.reject(
            generateErrorResponseByErrorCode(ERROR_CODES.AUTH.INVALID_TOKEN),
          );
        return Promise.resolve(mockLoginResponse);
      });

      const { manager } = await setup();
      expect(manager.user).toBeNull();
      manager.init();

      expect(manager.authBootstrapPending).toBe(true);

      await vi.waitFor(() => {
        expect(manager.authBootstrapPending).toBe(false);
      });
      expect(manager.user).not.toBeNull();

      const intervalsToPass = 10;
      await vi.advanceTimersByTimeAsync(
        TOKEN_CONSTRAINTS.ACCESS_TOKEN_EXPIRATION * intervalsToPass,
      );
      expect(refreshCounter).toBe(failOnAttempt);
      expect(manager.user).toBeNull();
      vi.useRealTimers();
    });
  });

  describe('onUserLogin()', () => {
    test('sets user and clears error', async () => {
      vi.mocked(api.post<BaseResponse>).mockResolvedValue(mockLoginResponse);
      const mockedUser = mockLoginResponse.data?.user;
      if (!mockedUser) throw new Error('Missing test user');

      const { manager } = await setup();
      manager.onUserLogin(mockedUser);

      expect(manager.user).toEqual(mockedUser);
      expect(manager.error).toBeNull();
      expect(manager.isAuthenticated).toBe(true);
    });

    test('on login sets session refresh at specific interval', async () => {
      let refreshCounter = 0;

      vi.useFakeTimers();
      vi.mocked(api.post<BaseResponse>).mockImplementation(() => {
        refreshCounter++;
        return Promise.resolve(mockLoginResponse);
      });
      const mockedUser = mockLoginResponse.data?.user;
      if (!mockedUser) throw new Error('Missing test user');

      const { manager } = await setup();
      expect(manager.user).toBeNull();
      expect(refreshCounter).toBe(0);

      manager.onUserLogin(mockedUser);
      expect(manager.user).toEqual(mockedUser);

      const intervalsToPass = 3;
      await vi.advanceTimersByTimeAsync(
        TOKEN_CONSTRAINTS.ACCESS_TOKEN_EXPIRATION * intervalsToPass,
      );
      expect(refreshCounter).toBeGreaterThan(0);
      expect(refreshCounter).toBe(intervalsToPass);
      vi.useRealTimers();
    });
  });

  describe('logout()', () => {
    test('clears user after successful logout', async () => {
      const postSpy = vi.spyOn(api, 'post');
      vi.mocked(api.post<BaseResponse>).mockResolvedValue(mockLoginResponse);
      const mockedUser = mockLoginResponse.data?.user;
      if (!mockedUser) throw new Error('Missing test user');

      const { manager } = await setup();
      manager.onUserLogin(mockedUser);

      expect(manager.user).toEqual(mockedUser);
      manager.logout();

      await vi.waitFor(() => {
        expect(manager.user).toBeNull();
        expect(manager.isAuthenticated).toBe(false);
        expect(postSpy).toHaveBeenCalledWith(API_ENDPOINTS.AUTH.LOGOUT);
      });
    });

    test('stops refresh interval on logout', async () => {
      vi.useFakeTimers();
      let refreshCounter = 0;
      vi.mocked(api.post<BaseResponse>).mockImplementation((path) => {
        if (!path.includes(API_ENDPOINTS.AUTH.LOGOUT)) refreshCounter++;
        return Promise.resolve(mockLoginResponse);
      });

      const mockedUser = mockLoginResponse.data?.user;
      if (!mockedUser) throw new Error('Missing test user');

      const { manager } = await setup();
      manager.onUserLogin(mockedUser);

      expect(manager.user).toEqual(mockedUser);
      manager.logout();
      await vi.advanceTimersByTimeAsync(
        TOKEN_CONSTRAINTS.ACCESS_TOKEN_EXPIRATION * 3,
      );
      expect(refreshCounter).toBe(0);
      vi.useRealTimers();
    });
  });
});
