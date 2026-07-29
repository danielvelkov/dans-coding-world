import { randNumber, randPastDate, randSentence } from '@ngneat/falso';
import type { ReportStatus } from '@dans-coding-world/prisma-schema';
import { generateRandomUser } from '@dans-coding-world/shared-user-testing';
import type { ReportDetail } from '@dans-coding-world/report-data-access';
import { generateRandomComments } from '@dans-coding-world/shared-post-testing';
import { generateReportHistoryList } from './comment-report-history-generator.js';

type ReportDetailOverwrite = Partial<Omit<ReportDetail, 'reportedComment'>> & {
  reportedComment?: Partial<ReportDetail['reportedComment']>;
};

export function generateRandomCommentReports(
  count: number,
  commentReportOverwrite: ReportDetailOverwrite = {},
): ReportDetail[] {
  const reports: ReportDetail[] = [];

  while (count > 0) {
    const author = generateRandomUser();
    const comment = generateRandomComments(
      randNumber({ min: 1, max: 1000 }),
      1,
    )[0];
    const reportId = randNumber({ min: 1, max: 1000 });
    const history = generateReportHistoryList(randNumber({ min: 0, max: 3 }), {
      reportId,
    });
    const report = {
      id: reportId,
      reason: randSentence({ length: randNumber({ min: 1, max: 1 }) }).join(
        ' ',
      ),
      createdAt: randPastDate(),
      status: 'PENDING' as ReportStatus,
      commentId: randNumber({ min: 1, max: 1000 }),
      reporterId: author.id,
      reportedBy: author,
      history,
      ...commentReportOverwrite,
      reportedComment: {
        ...comment,
        ...commentReportOverwrite.reportedComment,
      },
    } as ReportDetail;
    reports.push(report);
    count--;
  }
  return reports;
}
