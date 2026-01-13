import { ResponseErrorDetails } from '@dans-coding-world/api-types';
import { UseQueryResult } from '@tanstack/react-query';
import { waitFor, RenderHookResult } from '@testing-library/react';
import { vi, expect, Mock } from 'vitest';

export async function expectNetworkError({
  renderHook,
  apiMock,
}: {
  renderHook: () => RenderHookResult<UseQueryResult, unknown>;
  apiMock: Mock | ReturnType<typeof vi.fn>;
}) {
  const connectionError = new Error('Connection error occurred');
  apiMock.mockRejectedValue(connectionError);

  const { result } = renderHook();

  expect(result.current.isPending).toBe(true);
  expect(result.current.error).toBe(null);

  await waitFor(() => {
    expect(result.current.isError).toBe(true);
  });

  expect(result.current.error?.message).toBe(connectionError.message);
}

export async function expectApiError({
  renderHook,
  apiMock,
  error,
}: {
  renderHook: () => RenderHookResult<UseQueryResult, unknown>;
  apiMock: Mock | ReturnType<typeof vi.fn>;
  error: ResponseErrorDetails;
}) {
  apiMock.mockResolvedValue({
    data: null,
    success: false,
    error,
  });

  const { result } = renderHook();

  await waitFor(() => {
    expect(result.current.isError).toBe(true);
  });

  expect(result.current.data).toBeFalsy();
  expect(result.current.error).toBe(error);
}
