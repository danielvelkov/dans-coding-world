import { Report } from '@dans-coding-world/prisma-schema';
import {
  GetReportDto,
  GetReportsDto,
  GetReportsResponseDto,
  GetReportResponseDto,
  CreateReportDto,
  DeleteReportDto,
  UpdateReportDto,
} from '@dans-coding-world/shared-report-dto';

/**
 * Service for managing comment reports
 *
 * Provides full CRUD operations for comment reports, including retrieval with pagination.
 *
 * @example
 * ```typescript
 * class CommentReportsService implements ICommentReportsService {
 *   async search(dto: GetReportsDto) {
 *     // implementation
 *   }
 *   async create(dto: CreateReportDto) {
 *     // implementation
 *   }
 * }
 * ```
 */
export interface ICommentReportsService {
  /**
   * Retrieves comment reports. By default retrieves PENDING reports if no filters specified.
   *
   * **Filtering options:**
   * - By post id
   * - By malicious user id
   * - By report status (PENDING | REVIEWING | RESOLVED | DISMISSED)
   *
   * **Sorting options:**
   * - By creation date (createdAt)
   *
   * @param dto Contains filter options (optional) with pagination and sorting params (optional).
   * @returns A promise that resolves to a paginated list of reports about comments.
   * @example
   * ```typescript
   * const { items, count, pagination } = await commentReportsService.getAll({
   *   pageSize: 20,
   *   pageOffset: 0,
   * });
   * ```
   */
  getAll(dto: GetReportsDto): Promise<GetReportsResponseDto>;

  /**
   * Returns the report alongside report history, comment and reported user.
   *
   * @param dto - Request parameters like reportId
   * @returns Requested comment report with details
   *
   * @throws {Error} Report not found (SER002)
   */
  getById(dto: GetReportDto): Promise<GetReportResponseDto>;

  /**
   * Creates a pending report on a given comment.
   * User cannot create more than 1 report per comment.
   * User cannot create report on a comment he made.
   *
   * @param dto - commentId, postId, reporterId and the reason (optional)
   * @returns The newly created report
   *
   * @example
   * ```typescript
   * const commentReport = await commentReportsService.create({postId: 42, reporterId: 1, commentId: 4, reason: 'Harassment'});
   * ```
   * @throws {Error} When the post with this postId is not found (SER002)
   * @throws {Error} When the comment with this commentId is not found on the post (SER002)
   * @throws {Error} When a report from this user, for that comment already exists (VAL007)
   * @throws {Error} When the report is for a comment the user made themselves (SER003)
   * @throws {Error} When the post is not PUBLISHED and the userId is not
   * the author, ADMIN or MOD (SER003)
   */
  create(dto: CreateReportDto): Promise<Report>;

  /**
   * Changes report status and specifies moderator note.
   * The update is logged in the report's moderation history
   *
   * @description Admin or Moderator-only operation. Requires elevated privileges.
   * The requesting user cannot be updating the status of reports made about themselves
   *
   * @param dto - reportId, moderatorId, new status and the moderatorNote (optional)
   * @returns The updated report
   *
   * @example
   * ```typescript
   * const commentReport = await commentReportsService.updateStatus({reportId: 4, moderatorId: 1, status: 'RESOLVED', moderatorNote: 'User banned'});
   * ```
   * @throws {Error} Report not found (SER002)
   * @throws {Error} When same status is set when updating (VAL001)
   * @throws {Error} Forbidden update attempt - moderatorId is author of the reported comment (SER003)
   */
  updateStatus(dto: UpdateReportDto): Promise<Report>;

  /**
   * Deletes a comment report along with its related report history.
   *
   * @description Admin-only operation. Requires elevated privileges.
   *
   * @param dto - Deletion parameters including reportId
   * @returns The deleted report
   *
   * @example
   * ```typescript
   * const deletedReport = await commentReports.delete({
   *   reportId: 1,
   * });
   * ```
   *
   * @throws {Error} Report not found (SER002)
   */
  delete(dto: DeleteReportDto): Promise<Report>;
}
