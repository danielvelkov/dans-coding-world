<script lang="ts">
  import type { Report } from '@dans-coding-world/prisma-schema';
  type ReportStatus = Report['status'];
  interface Props {
    status?: ReportStatus;
  }

  let { status }: Props = $props();

  const statusConfig: Record<
    ReportStatus,
    { bg: string; text: string; border: string }
  > = {
    REVIEWING: {
      bg: 'bg-[var(--color-warning-bg)]',
      text: 'text-[var(--color-warning)]',
      border: 'border-[var(--color-warning-border)]',
    },
    PENDING: {
      bg: 'bg-[var(--color-info-bg)]',
      text: 'text-[var(--color-info)]',
      border: 'border-[var(--color-info-border)]',
    },
    RESOLVED: {
      bg: 'bg-[var(--color-success-subtle)]',
      text: 'text-[var(--color-success)]',
      border: 'border-[var(--color-border-emphasis)]',
    },
    DISMISSED: {
      bg: 'bg-[var(--color-bg-surface-hover)]',
      text: 'text-[var(--color-text-secondary)]',
      border: 'border-[var(--color-border-subtle)]',
    },
  };

  const config = $derived(
    (status && statusConfig[status]) ?? {
      bg: 'bg-[var(--color-bg-muted)]',
      text: 'text-[var(--color-text-tertiary)]',
      border: 'border-[var(--color-border-subtle)]',
    },
  );
</script>

<span
  class="w-fit inline-flex items-center gap-1.5 px-3 py-1 rounded-full
   text-xs font-semibold tracking-wider uppercase border transition-colors {config.bg} {config.text} {config.border}"
>
  {status}
</span>
