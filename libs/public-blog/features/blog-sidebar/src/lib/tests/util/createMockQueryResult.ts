import { UseQueryResult } from '@tanstack/react-query';
export function createMockQueryResult<T>(
  overrides?: Partial<UseQueryResult<T>>
): UseQueryResult<T> {
  return {
    data: undefined as T | undefined,
    error: null,
    isLoading: false,
    isError: false,
    ...overrides,
  } as UseQueryResult<T>;
}

export default createMockQueryResult;
