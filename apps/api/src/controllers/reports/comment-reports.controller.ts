import type { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import {
  CreateReportDto,
  DeleteReportDto,
  GetReportsDto,
  UpdateReportDto,
} from '@dans-coding-world/shared-report-dto';
import { Authorized, RequiredRole } from '@dans-coding-world/api-auth';
import { SUCCESS_MESSAGES } from '@dans-coding-world/shared-constants';
import { ICommentReportsService } from '@dans-coding-world/api-reports';
import { User } from '@dans-coding-world/prisma-schema';

export class CommentReportsController {
  constructor(private reportsService: ICommentReportsService) {
    this.get = this.get.bind(this);
    this.getAll = this.getAll.bind(this);
    this.create = this.create.bind(this);
    this.updateStatus = this.updateStatus.bind(this);
    this.delete = this.delete.bind(this);
  }

  @Authorized()
  @RequiredRole('ADMIN', 'MOD')
  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const { report } = await this.reportsService.getById({
        reportId: id as any,
      });

      return res.status(StatusCodes.OK).json({
        message: SUCCESS_MESSAGES.REPORTS.get,
        report,
      });
    } catch (error) {
      return next(error);
    }
  }

  @Authorized()
  @RequiredRole('ADMIN', 'MOD')
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const getReportsDto: GetReportsDto = {
        ...req.query,
      };

      const reportsWithMetadata = await this.reportsService.getAll(
        getReportsDto
      );

      return res.status(StatusCodes.OK).json({
        message: SUCCESS_MESSAGES.REPORTS.getAll,
        ...reportsWithMetadata,
      });
    } catch (error) {
      return next(error);
    }
  }

  @Authorized()
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user as User;

      const createReportDto: CreateReportDto = {
        ...req.body,
        reporterId: user.id,
      };

      const report = await this.reportsService.create(createReportDto);

      return res.status(StatusCodes.OK).json({
        message: SUCCESS_MESSAGES.REPORTS.create,
        report,
      });
    } catch (error) {
      return next(error);
    }
  }

  @Authorized()
  @RequiredRole('ADMIN', 'MOD')
  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user as User;
      const { id } = req.params;

      const updateReportDto: UpdateReportDto = {
        ...req.body,
        reportId: +id,
        moderatorId: user?.id,
      };

      const report = await this.reportsService.updateStatus(updateReportDto);

      return res.status(StatusCodes.OK).json({
        message: SUCCESS_MESSAGES.REPORTS.updateStatus,
        report,
      });
    } catch (error) {
      return next(error);
    }
  }

  @Authorized()
  @RequiredRole('ADMIN')
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const deleteReportDto: DeleteReportDto = {
        reportId: +id,
      };

      const report = await this.reportsService.delete(deleteReportDto);

      return res.status(StatusCodes.OK).json({
        message: SUCCESS_MESSAGES.REPORTS.delete,
        report,
      });
    } catch (error) {
      return next(error);
    }
  }
}
