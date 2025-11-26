/**
 * Interface for managing comments
 */
export interface ICommentRepository<Comment, TWhereInput, TOrderBy> {
  getById(
    id: number,
    options?: {
      includeReplies?: boolean;
      maxReplyTreeDepth?: number;
    }
  ): Promise<Comment | null>;
  create(data: Omit<Comment, 'id'>): Promise<Comment>;
  update(id: number, data: Partial<Comment>): Promise<Comment>;
  search(
    where?: TWhereInput,
    orderBy?: TOrderBy,
    options?: {
      skip?: number;
      take?: number;
      includeReplies?: boolean;
      maxReplyTreeDepth?: number;
    }
  ): Promise<Comment[]>;
  delete(id: number): Promise<Comment>;
  deleteMany(where: TWhereInput): Promise<number>;
  count(where?: TWhereInput): Promise<number>;
}
