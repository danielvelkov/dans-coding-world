/**
 * Interface for managing reports
 */
export interface IReportRepository<Report, TWhereInput, TOrderBy> {
  getById(id: number): Promise<Report | null>;
  create(data: Omit<Report, 'id'>): Promise<Report>;
  update(id: number, data: Partial<Report>): Promise<Report>;
  search(
    where?: TWhereInput,
    orderBy?: TOrderBy,
    options?: {
      skip?: number;
      take?: number;
    }
  ): Promise<Report[]>;
  delete(id: number): Promise<Report>;
  deleteMany(where: TWhereInput): Promise<number>;
  exists(where: TWhereInput): Promise<boolean>;
}
