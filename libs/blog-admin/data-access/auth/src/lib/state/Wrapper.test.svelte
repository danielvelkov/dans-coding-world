<script lang="ts">
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import Inner from './Inner.test.svelte';

  interface Props {
    queryClient: QueryClient;
    onReady: () => void;
  }

  const { queryClient, onReady }: Props = $props();
</script>

<!-- TODO fix this somehow -->
<!-- Because we need the provider and we can't wrap it in the vitest-svelte-browser render method,
  we resort to making a whole component wrapper with child component that instantiates AuthStateManager -->

<QueryClientProvider client={queryClient}>
  <Inner {onReady} />
</QueryClientProvider>
