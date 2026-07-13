<script lang="ts">
  interface Props {
    onReady: () => void;
  }

  const { onReady }: Props = $props();

  onReady();
</script>
