import type { ReportDetailExtended } from '@dans-coding-world/report-data-access';

export type ReportAction =
  | { type: 'CHANGE_STATUS'; targetStatus: ReportDetailExtended['status'] }
  | { type: 'DELETE_COMMENT' }
  | { type: 'TOGGLE_BAN' }
  | { type: 'DELETE_REPORT' };

export interface ReportUserContext {
  id: number | string;
  role: ReportDetailExtended['reportedBy']['role'];
}

/**
 * Default status change notes.
 * Takes the report ID and acting user context to build standard report history notes.
 */
export const DEFAULT_REPORT_STATUS_NOTES: Record<
  ReportDetailExtended['status'],
  (reportId: number | string, user: ReportUserContext) => string
> = {
  PENDING: (reportId, user) =>
    `Status reset to Pending for Report #${reportId} by ${user.role} #${user.id}`,

  REVIEWING: (reportId, user) =>
    `Status changed to Reviewing for Report #${reportId} by ${user.role} #${user.id}`,

  DISMISSED: (reportId, user) =>
    `Report #${reportId} dismissed by ${user.role} #${user.id}. No violation found.`,

  RESOLVED: (reportId, user) =>
    `Report #${reportId} marked as Resolved without further action by ${user.role} #${user.id}`,
};
