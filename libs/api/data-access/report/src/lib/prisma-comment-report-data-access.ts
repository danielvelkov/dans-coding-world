import {
  Report,
  ReportWhereInput,
  ReportOrderByInput,
  client,
  User,
  Comment,
  ReportHistory,
} from '@dans-coding-world/prisma-schema';
import { IReportRepository } from '@dans-coding-world/shared-data-access-interfaces';

export type ReportDetail = Report & {
  reportedBy: User;
  reportedComment: Comment;
  history: ReportHistory[];
};

export class PrismaCommentReportDataAccess
  implements IReportRepository<Report, ReportWhereInput, ReportOrderByInput>
{
  async getById(id: number): Promise<Report | null> {
    return await client.report.findFirst({
      where: { id },
      include: {
        reportedComment: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                username: true,
                role: true,
                password: false,
              },
            },
          },
        },
        reportedBy: {
          select: {
            id: true,
            email: true,
            username: true,
            role: true,
            password: false,
          },
        },
        history: true,
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
      },
    });
  }

  async update(id: number, data: Partial<Report>): Promise<Report> {
    return await client.report.update({
      where: { id },
      data,
      include: {
        history: true,
      },
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

  async count(where: ReportWhereInput): Promise<number> {
    return await client.report.count({ where });
  }
}
