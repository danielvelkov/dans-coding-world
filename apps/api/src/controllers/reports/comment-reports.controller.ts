import type { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import {} from '@dans-coding-world/shared-report-dto';
import { Authorized, RequiredRole } from '@dans-coding-world/api-auth';
import { SUCCESS_MESSAGES } from '@dans-coding-world/shared-constants';
import { ICommentReportsService } from '@dans-coding-world/api-reports';

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

      const report = await this.reportsService.getById({
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
    throw new Error('Not implemented');
  }

  @Authorized()
  async create(req: Request, res: Response, next: NextFunction) {
    throw new Error('Not implemented');
  }

  @Authorized()
  @RequiredRole('ADMIN', 'MOD')
  async updateStatus(req: Request, res: Response, next: NextFunction) {
    throw new Error('Not implemented');
  }

  @Authorized()
  @RequiredRole('ADMIN')
  async delete(req: Request, res: Response, next: NextFunction) {
    throw new Error('Not implemented');
  }
}
