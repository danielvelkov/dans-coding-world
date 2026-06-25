<script lang="ts">
  import { StatusCodes, ReasonPhrases } from 'http-status-codes';
  import type { Snippet } from 'svelte';

  interface Props {
    statusCode?: number;
    message?: string;
    children: Snippet<[]>;
  }

  const { statusCode, message, children }: Props = $props();
</script>

<div
  class="mt-[20vh] flex flex-col items-center justify-center bg-(--color-background)"
>
  <h1 class="text-6xl font-bold text-(--color-foreground)">
    {statusCode ?? StatusCodes.INTERNAL_SERVER_ERROR}
  </h1>
  <p class="mt-4 text-lg text-(--color-muted-foreground)">
    {message ?? ReasonPhrases.INTERNAL_SERVER_ERROR}
  </p>
  {@render children()}
</div>
