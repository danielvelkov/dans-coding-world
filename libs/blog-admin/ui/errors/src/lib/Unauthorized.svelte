<script lang="ts">
  import { StatusCodes, ReasonPhrases } from 'http-status-codes';
  import type { Snippet } from 'svelte';
  import GenericError from './GenericError.svelte';

  interface Props {
    message?: string;
    children?: Snippet<[]>;
  }

  const { message, children }: Props = $props();
</script>

<GenericError
  statusCode={StatusCodes.UNAUTHORIZED}
  message={message ?? ReasonPhrases.UNAUTHORIZED}
  {children}
></GenericError>
