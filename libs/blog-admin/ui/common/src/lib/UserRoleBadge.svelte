<script lang="ts">
  import type { User } from '@dans-coding-world/prisma-schema';

  interface Props {
    role?: User['role'];
  }

  let { role }: Props = $props();

  const roleConfig: Record<
    User['role'],
    { icon: string; bg: string; text: string; border: string }
  > = {
    ADMIN: {
      icon: 'fa fa-wrench',
      bg: 'bg-[var(--color-error-bg)]',
      text: 'text-[var(--color-error)]',
      border: 'border-[var(--color-error-border)]',
    },
    MOD: {
      icon: 'fa fa-shield',
      bg: 'bg-[var(--color-info-bg)]',
      text: 'text-[var(--color-info)]',
      border: 'border-[var(--color-info-border)]',
    },
    AUTHOR: {
      icon: 'fa fa-pencil',
      bg: 'bg-[var(--color-accent-subtle)]',
      text: 'text-[var(--color-accent)]',
      border: 'border-[var(--color-border-emphasis)]',
    },
    USER: {
      icon: 'fa fa-user',
      bg: 'bg-[var(--color-bg-surface-hover)]',
      text: 'text-[var(--color-text-secondary)]',
      border: 'border-[var(--color-border-subtle)]',
    },
  };

  const config = $derived(
    (role && roleConfig[role]) ?? {
      icon: 'fa fa-user',
      bg: 'bg-[var(--color-bg-muted)]',
      text: 'text-[var(--color-text-tertiary)]',
      border: 'border-[var(--color-border-subtle)]',
    },
  );
</script>

<span
  class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full
   text-xs font-semibold tracking-wider uppercase border transition-colors {config.bg} {config.text} {config.border}"
>
  <i class="{config.icon} text-[0.7rem]" aria-hidden="true"></i>
  {role}
</span>
