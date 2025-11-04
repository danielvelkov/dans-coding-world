/**
 * Generic interface for managing Post entities in a data store.
 *
 * @template Post - The shape of the Post entity.
 * @template TWhereInput - The filter type used for querying posts.
 * @template TOrderBy - The type used to specify sorting order.
 */
export interface IPostRepository<Post, TWhereInput, TOrderBy> {
  getById(id: number): Promise<Post | null>;
  create(data: Omit<Post, 'id'>): Promise<Post>;
  update(id: number, data: Partial<Post>): Promise<Post>;
  search(
    where?: TWhereInput,
    orderBy?: TOrderBy,
    options?: {
      skip?: number;
      take?: number;
    }
  ): Promise<Post[]>;
  delete(id: number): Promise<Post>;
  deleteMany(where: TWhereInput): Promise<number>;
  exists(title: string): Promise<boolean>;
  count(where?: TWhereInput): Promise<number>;
}
