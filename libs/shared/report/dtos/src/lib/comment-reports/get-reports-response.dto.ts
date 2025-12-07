import { ReportDetail } from '@dans-coding-world/report-data-access';
import { Collection, Paginated } from '@dans-coding-world/api-types';
export type GetReportsResponseDto = Collection<ReportDetail> & Paginated;
