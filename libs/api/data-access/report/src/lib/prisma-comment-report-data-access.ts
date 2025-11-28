import {
  Report,
  ReportWhereInput,
  ReportOrderByInput,
  client,
} from '@dans-coding-world/prisma-schema';
import { IReportRepository } from '@dans-coding-world/shared-data-access-interfaces';

export class PrismaCommentReportDataAccess
  implements IReportRepository<Report, ReportWhereInput, ReportOrderByInput>
{
  async getById(id: number): Promise<Report | null> {
    return await client.report.findFirst({
      where: { id },
      include: {
        reportedComment: true,
        reportedBy: true,
      },
    });
  }

  async create(data: Omit<Report, 'id'>): Promise<Report> {
    return await client.report.create({
      data,
    });
  }

  async search(
    where: ReportWhereInput,
    orderBy?: ReportOrderByInput,
    options?: {
      skip?: number;
      take?: number;
    }
  ): Promise<Report[]> {
    return await client.report.findMany({
      where,
      orderBy,
      skip: options?.skip,
      take: options?.take,
      include: {
        reportedComment: true,
        reportedBy: true,
      },
    });
  }

  async update(id: number, data: Partial<Report>): Promise<Report> {
    return await client.report.update({
      where: { id },
      data,
    });
  }

  async delete(id: number): Promise<Report> {
    return await client.report.delete({
      where: { id },
    });
  }

  async deleteMany(where: ReportWhereInput): Promise<number> {
    const { count } = await client.report.deleteMany({ where });
    return count;
  }

  async exists(where: ReportWhereInput): Promise<boolean> {
    const post = await client.report.findFirst({
      where,
      select: { id: true },
    });
    return !!post;
  }
}
