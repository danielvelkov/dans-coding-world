import {
  Report,
  ReportWhereInput,
  ReportOrderByInput,
  User,
} from '@dans-coding-world/prisma-schema';
import {
  CreateReportDto,
  DeleteReportDto,
  GetReportDto,
  GetReportResponseDto,
  GetReportsDto,
  GetReportsResponseDto,
  UpdateReportDto,
} from '@dans-coding-world/shared-report-dto';
import { Inject, Injectable } from 'injection-js';
import type {
  IReportRepository,
  IUserRepository,
} from '@dans-coding-world/shared-data-access-interfaces';
import { transformAndValidateDto } from '@dans-coding-world/validation';
import { ApiException } from '@dans-coding-world/exceptions';
import { ERROR_CODES, PAGINATION } from '@dans-coding-world/shared-constants';
import { ICommentReportsService } from '../interfaces/comment-reports-service.interface.js';
import { ReportDetail } from '@dans-coding-world/report-data-access';

export const COMMENT_REPORTS_REPOSITORY_TOKEN = 'ICommentReportsRepository';
export const USER_REPOSITORY_TOKEN = 'IUserRepository';

/**
 * Service related to reports made on comments.
 *
 * **Access control:**
 * - Users can create reports on comments
 * - Moderators have view rights for all reports, but edit rights only to reports that are not about themselves
 * - Admins have access to everything
 *
 *
 * @example
 * ```typescript
 * const { report } = commentReportsService.getById({reportId: 1})
 * ```
 */
@Injectable()
export class CommentReportsService implements ICommentReportsService {
  constructor(
    @Inject(COMMENT_REPORTS_REPOSITORY_TOKEN)
    public reports: IReportRepository<
      Report,
      ReportWhereInput,
      ReportOrderByInput
    >,
    @Inject(USER_REPOSITORY_TOKEN)
    public users: IUserRepository
  ) {}

  getAll(dto: GetReportsDto): Promise<GetReportsResponseDto> {
    throw new Error('Method not implemented.');
  }

  async getById(dto: GetReportDto): Promise<GetReportResponseDto> {
    dto = await transformAndValidateDto(dto, GetReportDto);

    const report = (await this.reports.getById(dto.reportId)) as ReportDetail;
    if (!report) throw new ApiException(ERROR_CODES.SERVER.NOT_FOUND);

    return { report };
  }

  create(dto: CreateReportDto): Promise<Report> {
    throw new Error('Method not implemented.');
  }
  updateStatus(dto: UpdateReportDto): Promise<Report> {
    throw new Error('Method not implemented.');
  }
  delete(dto: DeleteReportDto): Promise<Report> {
    throw new Error('Method not implemented.');
  }
}
