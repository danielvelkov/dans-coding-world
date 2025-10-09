import {
  Post,
  PostWhereInput,
  PostOrderByInput,
  client,
} from '@dans-coding-world/prisma-schema';
import { IPostRepository } from '@dans-coding-world/shared-data-access-interfaces';

export class PrismaPostDataAccess
  implements IPostRepository<Post, PostWhereInput, PostOrderByInput>
{
  async getById(id: number): Promise<Post | null> {
    return await client.post.findFirst({
      where: {
        id,
      },
    });
  }
  async create(data: Omit<Post, 'id'>): Promise<Post> {
    return await client.post.create({
      data,
    });
  }
  async update(id: number, data: Partial<Post>): Promise<Post> {
    return await client.post.update({
      where: {
        id,
      },
      data,
    });
  }
  async search(
    where: PostWhereInput,
    orderBy?: PostOrderByInput,
    skip?: number,
    take?: number
  ): Promise<Post[]> {
    return await client.post.findMany({
      where,
      orderBy,
      skip,
      take,
    });
  }
  async delete(id: number): Promise<Post> {
    return await client.post.delete({
      where: {
        id,
      },
    });
  }
  async deleteMany(where: PostWhereInput): Promise<number> {
    const { count } = await client.post.deleteMany({
      where,
    });
    return count;
  }
}
