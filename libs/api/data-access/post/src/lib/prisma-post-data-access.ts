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
    options?: {
      skip?: number;
      take?: number;
    }
  ): Promise<Post[]> {
    return await client.post.findMany({
      where,
      orderBy,
      skip: options?.skip,
      take: options?.take,
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

  async exists(title: string): Promise<boolean> {
    const post = await client.post.findFirst({
      where: {
        title: {
          equals: title.toLowerCase(),
          mode: 'insensitive', // Case-insensitive match
        },
      },
    });
    return !!post;
  }

  async count(where: PostWhereInput): Promise<number> {
    return await client.post.count({ where });
  }
}
