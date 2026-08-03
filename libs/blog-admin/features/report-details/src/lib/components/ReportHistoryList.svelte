<script lang="ts">
  import type { ReportDetailExtended } from '@dans-coding-world/report-data-access';
  import {
    formatDateTo_DD_MMM_YYYY,
    formatToRelativeTimeFromDate,
  } from '@dans-coding-world/helpers';
  import { ReportStatusPill } from '@dans-coding-world/blog-admin-ui-common';

  interface Props {
    report: ReportDetailExtended;
  }

  const { report }: Props = $props();
</script>

<div class="p-4 relative">
  <!-- Vertical Timeline Connector Line -->
  <div
    class="absolute left-6.75 top-6 bottom-6 w-0.5 bg-(--color-border-subtle) z-0"
  ></div>

  <div class="space-y-6 relative z-10">
    {@render ReportHistoryEntry({
      previousStatus: null,
      newStatus: 'PENDING',
      actor: report.reportedBy.username,
      role: 'REPORTER',
      time: formatDateTo_DD_MMM_YYYY(new Date(report.createdAt)),
      note: `Report submitted for reason: "${report.reason}"`,
    })}
    {#each report.history as entry (entry.id)}
      {@render ReportHistoryEntry({
        previousStatus: entry.previousStatus,
        newStatus: entry.newStatus,
        actor: entry.moderator.username,
        role: entry.moderator.role === 'ADMIN' ? 'ADMIN' : 'MOD',
        time: formatToRelativeTimeFromDate(
          new Date(entry.changedAt),
          new Date(),
        ),
        note: entry.note ?? '',
      })}
    {/each}
  </div>
</div>

{#snippet ReportHistoryEntry(data: {
  previousStatus?: ReportDetailExtended['status'] | null;
  newStatus: ReportDetailExtended['status'];
  actor: string;
  role?: 'REPORTER' | 'MOD' | 'ADMIN';
  note: string;
  time: string;
})}
  <div class="flex gap-4 items-start group">
    <div
      class="w-6 aspect-square rounded-full bg-(--color-bg-surface) border-2 border-(--color-border-emphasis)
       flex items-center justify-center shrink-0 text-(--color-text-secondary) shadow-xs mt-1"
    >
      <i class="fa fa-circle text-[10px]"></i>
    </div>

    <!-- Content Card -->
    <div
      class="flex-1 bg-(--color-bg-surface) p-3 rounded-lg border border-(--color-border-subtle) space-y-2"
    >
      <!-- Header: Status Change & Timestamp -->
      <div
        class="flex flex-wrap items-center justify-between gap-2 border-b border-(--color-border-subtle) pb-2"
      >
        <!-- Status Transition Badges -->
        <div class="flex items-center gap-1.5 flex-wrap">
          {#if data.previousStatus}
            <ReportStatusPill status={data.previousStatus} />
            <i
              class="fa fa-arrow-right text-[10px] text-(--color-text-tertiary)"
            ></i>
          {/if}
          <ReportStatusPill status={data.newStatus} />
        </div>

        <time class="text-xs text-(--color-text-tertiary) font-mono">
          {data.time}
        </time>
      </div>

      <!-- Actor & Note Body -->
      <div class="text-xs space-y-1">
        <div class="flex items-center gap-1.5 text-(--color-text-secondary)">
          <span class="font-semibold text-(--color-text-primary)"
            >{data.actor}</span
          >
          {#if data.role}
            <span
              class="text-[10px] px-1.5 py-0.2 bg-(--color-bg-subtle) rounded border border-(--color-border-subtle) font-mono"
            >
              {data.role}
            </span>
          {/if}
        </div>

        <p class="text-sm text-(--color-text-secondary) leading-relaxed">
          {data.note}
        </p>
      </div>
    </div>
  </div>
{/snippet}
