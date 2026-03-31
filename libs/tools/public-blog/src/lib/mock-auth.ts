import { vi } from 'vitest';
import { useAuth } from '@dans-coding-world/public-blog-shared-hooks';

export function mockAuth(overrides: Partial<ReturnType<typeof useAuth>> = {}) {
  vi.mocked(useAuth).mockReturnValue({
    isAuthenticated: false,
    user: null,
    error: null,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    ...overrides,
  });
}
