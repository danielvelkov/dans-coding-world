import {
  createLogoutMutation,
  createRefreshUserAuthMutation,
} from '@dans-coding-world/blog-admin-data-access-operations';
import type { User } from '@dans-coding-world/prisma-schema';
import { TOKEN_CONSTRAINTS } from '@dans-coding-world/shared-constants';

type UserWithoutPass = Omit<User, 'password'>;

/**
 * Core authentication state for the application.
 * Intended to be used inside components wrapped in QueryClientProvider.
 *
 * Handles:
 * - user login
 * - logout mutation
 * - Silent token refresh (rehydration from httpOnly cookie)
 * - Periodic access token refresh via interval
 */
export class AuthStateManager {
  private refreshInterval: ReturnType<typeof setInterval> | null = null;

  user = $state<UserWithoutPass | null>(null);
  error = $state<Error | null>(null);
  authBootstrapPending = $state(true);

  public init = () => {
    this.refreshMutation.mutate();
  };

  private refreshMutation = createRefreshUserAuthMutation({
    onSuccess: (data) => {
      this.setUser(data?.user ?? null);
    },

    onError: (error) => {
      this.setUser(null);
      this.error = error;
    },

    onSettled: () => {
      this.authBootstrapPending = false;
    },
    throwOnError: false,
  });

  private logoutMutation = createLogoutMutation({
    onError: (error) => {
      this.error = error;
    },

    onSettled: () => {
      this.setUser(null);
    },
    throwOnError: false,
  });

  private startRefreshLoop() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    if (!this.user) return;

    this.refreshInterval = setInterval(() => {
      this.refreshMutation.mutate();
    }, TOKEN_CONSTRAINTS.ACCESS_TOKEN_EXPIRATION);
  }

  public setUser = (user: UserWithoutPass | null) => {
    this.user = user;

    if (!user) {
      if (this.refreshInterval) {
        clearInterval(this.refreshInterval);
        this.refreshInterval = null;
      }

      return;
    }

    this.startRefreshLoop();
  };

  public onUserLogin = (user: UserWithoutPass) => {
    this.error = null;
    this.setUser(user);
  };

  public logout = () => {
    this.logoutMutation.mutate();
  };

  isLoading = $derived(
    this.authBootstrapPending ||
      this.refreshMutation.isPending ||
      this.logoutMutation.isPending,
  );

  isAuthenticated = $derived(!!this.user);
}
