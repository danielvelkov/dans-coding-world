import {
  Report,
  ReportWhereInput,
  ReportOrderByInput,
  User,
  Post,
  PostWhereInput,
  PostOrderByInput,
  Comment,
  CommentWhereInput,
  CommentsOrderByInput,
  client,
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
  ICommentRepository,
  IPostRepository,
  IReportRepository,
  IUserRepository,
} from '@dans-coding-world/shared-data-access-interfaces';
import { transformAndValidateDto } from '@dans-coding-world/validation';
import { ApiException } from '@dans-coding-world/exceptions';
import {
  ERROR_CODES,
  PAGINATION,
  VALIDATION_MESSAGES,
} from '@dans-coding-world/shared-constants';
import { ICommentReportsService } from '../interfaces/comment-reports-service.interface.js';
import { ReportDetail } from '@dans-coding-world/report-data-access';

export const COMMENT_REPORTS_REPOSITORY_TOKEN = 'ICommentReportsRepository';
export const USER_REPOSITORY_TOKEN = 'IUserRepository';
export const POST_REPOSITORY_TOKEN = 'IPostRepository';
export const COMMENT_REPOSITORY_TOKEN = 'ICommentRepository';

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
    public users: IUserRepository,
    @Inject(POST_REPOSITORY_TOKEN)
    public posts: IPostRepository<Post, PostWhereInput, PostOrderByInput>,
    @Inject(COMMENT_REPOSITORY_TOKEN)
    public comments: ICommentRepository<
      Comment,
      CommentWhereInput,
      CommentsOrderByInput
    >
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

  async create(dto: CreateReportDto): Promise<Report> {
    dto = await transformAndValidateDto(dto, CreateReportDto);

    await this.validateReportingAccess(
      dto.commentId,
      dto.postId,
      dto.reporterId
    );

    const reportExists = await this.reports.exists({
      reporterId: dto.reporterId,
      commentId: dto.commentId,
    });

    if (reportExists)
      throw new ApiException(ERROR_CODES.VALIDATION.REPORT_EXISTS);

    const createdReport = await this.reports.create({
      ...dto,
      status: 'PENDING',
      createdAt: new Date(),
    });

    return createdReport;
  }

  async updateStatus(dto: UpdateReportDto): Promise<ReportDetail> {
    dto = await transformAndValidateDto(dto, UpdateReportDto);

    const reportForUpdate = (await this.reports.getById(
      dto.reportId
    )) as ReportDetail;

    if (!reportForUpdate) throw new ApiException(ERROR_CODES.SERVER.NOT_FOUND);

    if (reportForUpdate.status === dto.status)
      throw new ApiException(
        ERROR_CODES.VALIDATION.VALIDATION_ERROR,
        VALIDATION_MESSAGES.reports.sameStatus
      );

    const { reportedComment } = reportForUpdate;

    if (reportedComment.userId === dto.moderatorId)
      throw new ApiException(ERROR_CODES.SERVER.FORBIDDEN);

    const [report, historyEntry] = await client.$transaction([
      client.report.update({
        where: { id: reportForUpdate.id },
        data: { status: dto.status },
        include: {
          history: true,
        },
      }),
      client.reportHistory.create({
        data: {
          reportId: reportForUpdate.id,
          previousStatus: reportForUpdate.status,
          moderatorId: dto.moderatorId,
          newStatus: dto.status,
          note: dto.note,
          changedAt: new Date(),
        },
      }),
    ]);

    return {
      ...(report as ReportDetail),
      history: [...report.history, historyEntry],
    };
  }

  async delete(dto: DeleteReportDto): Promise<Report> {
    dto = await transformAndValidateDto(dto, DeleteReportDto);

    const reportExists = await this.reports.exists({
      id: dto.reportId,
    });

    if (!reportExists) throw new ApiException(ERROR_CODES.SERVER.NOT_FOUND);

    return await this.reports.delete(dto.reportId);
  }

  /**
   *
   * @param commentId Comment Id
   * @param postId Post Id
   * @param viewerId User trying to report a comment on a post
   * @returns
   */
  private async validateReportingAccess(
    commentId: number,
    postId: number,
    viewerId: number
  ): Promise<void> {
    const post = await this.posts.getById(postId);
    if (!post) throw new ApiException(ERROR_CODES.SERVER.NOT_FOUND);

    const comment = await this.comments.getById(commentId);
    if (!comment) throw new ApiException(ERROR_CODES.SERVER.NOT_FOUND);

    const user = await this.users.getById(viewerId.toString());
    if (!user) throw new ApiException(ERROR_CODES.VALIDATION.USER_MISSING);

    if (user.id === comment.userId)
      throw new ApiException(ERROR_CODES.SERVER.FORBIDDEN);

    if (user.role === 'ADMIN' || user.role === 'MOD') return;

    if (post.status !== 'PUBLISHED' && viewerId !== post.authorId) {
      throw new ApiException(ERROR_CODES.SERVER.FORBIDDEN);
    }
  }
}
