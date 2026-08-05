import { randomSelect } from '@dans-coding-world/helpers';
import type {
  ReportStatus,
  ReportHistory,
} from '@dans-coding-world/prisma-schema';
import { randNumber, randPastDate, randParagraph } from '@ngneat/falso';

const ReportStatusEnum = [
  'DISMISSED',
  'PENDING',
  'RESOLVED',
  'REVIEWING',
] as ReportStatus[];

export function generateReportHistory(
  reportHistoryOverwrite: Partial<ReportHistory> = {},
): ReportHistory {
  const previousStatus = randomSelect(Object.values(ReportStatusEnum));
  // Ensure newStatus is different from previousStatus for realistic history
  const remainingStatuses = Object.values(ReportStatusEnum).filter(
    (s) => s !== previousStatus,
  );
  const newStatus = randomSelect(remainingStatuses);

  const defaultReportHistory: ReportHistory = {
    id: randNumber({ min: 1, max: 5_000_000 }),
    note: randParagraph(),
    reportId: randNumber({ min: 1, max: 5_000_000 }),
    moderatorId: randNumber({ min: 1, max: 5_000_000 }),
    previousStatus,
    newStatus,
    changedAt: randPastDate(),
  };

  return {
    ...defaultReportHistory,
    ...reportHistoryOverwrite,
  };
}

export function generateReportHistoryList(
  count: number,
  reportHistoryOverwrite: Partial<ReportHistory> = {},
): ReportHistory[] {
  return Array.from({ length: count }, () =>
    generateReportHistory(reportHistoryOverwrite),
  );
}
