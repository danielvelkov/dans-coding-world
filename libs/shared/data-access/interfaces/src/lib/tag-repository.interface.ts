/**
 * Interface for managing post tags
 */
export interface ITagRepository<Tag, TWhereInput> {
  getById(id: number): Promise<Tag | null>;
  create(data: Omit<Tag, 'id'>): Promise<Tag>;
  update(id: number, data: Partial<Tag>): Promise<Tag>;
  search(where?: TWhereInput): Promise<Tag[]>;
  delete(id: number): Promise<Tag>;
  deleteMany(where: TWhereInput): Promise<number>;
  count(where?: TWhereInput): Promise<number>;
  exists(name: string): Promise<boolean>;
}
