import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

export function renderReactQueryHook<T>(
  hook: () => T,
  extraWrapper?: React.ComponentType<{ children: React.ReactNode }>
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  const BaseWrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  // If no extra wrapper is provided, just use BaseWrapper
  const FinalWrapper = extraWrapper
    ? ({ children }: { children: React.ReactNode }) => (
        <BaseWrapper>
          {React.createElement(extraWrapper, null, children)}
        </BaseWrapper>
      )
    : BaseWrapper;

  return renderHook(hook, { wrapper: FinalWrapper });
}
