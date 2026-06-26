<script lang="ts">
  interface Props {
    loadingMessage?: string;
    class?: string;
  }
  const { class: className, loadingMessage }: Props = $props();
</script>

<div role="status" class="flex items-center justify-center">
  <div
    aria-hidden="true"
    class="loader w-6 aspect-square {className ?? ''}"
  ></div>
  <span class="sr-only">{loadingMessage ?? 'Loading...'}</span>
</div>

<style>
  .loader {
    /* Use Tailwind CSS variable for foreground color */
    --dot-color: var(--color-accent-glow);

    background: radial-gradient(
        circle closest-side,
        var(--dot-color) 90%,
        transparent
      )
      0 / calc(100% / 3) 100% space;

    clip-path: inset(0 100% 0 0);
    animation: dots 1s steps(4) infinite;
  }

  @keyframes dots {
    to {
      clip-path: inset(0 -34% 0 0);
    }
  }
</style>
