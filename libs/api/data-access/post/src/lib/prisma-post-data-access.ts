import {
  Post,
  PostWhereInput,
  PostOrderByInput,
  client,
} from '@dans-coding-world/prisma-schema';
import { IPostRepository } from '@dans-coding-world/shared-data-access-interfaces';

export type PostDetail = Post & { tags?: string[] };

export class PrismaPostDataAccess
  implements IPostRepository<Post, PostWhereInput, PostOrderByInput>
{
  async getById(id: number): Promise<Post | null> {
    const post = await client.post.findFirst({
      where: { id },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });
    return post;
  }

  async create(data: Omit<PostDetail, 'id'>): Promise<Post> {
    const { tags, ...postData } = data;

    return await client.post.create({
      data: {
        ...postData,
        ...(tags &&
          tags.length > 0 && {
            tags: {
              create: tags.map((name: string) => ({
                tag: {
                  connectOrCreate: {
                    where: {
                      name,
                    },
                    create: {
                      name,
                    },
                  },
                },
              })),
            },
          }),
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });
  }

  async update(id: number, data: Partial<PostDetail>): Promise<Post> {
    const { tags, ...postData } = data;

    return await client.post.update({
      where: { id },
      data: {
        ...postData,
        ...(tags &&
          tags.length > 0 && {
            tags: {
              create: tags.map((name: string) => ({
                tag: {
                  connectOrCreate: {
                    where: {
                      name,
                    },
                    create: {
                      name,
                    },
                  },
                },
              })),
            },
          }),
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
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
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });
  }

  async delete(id: number): Promise<Post> {
    return await client.post.delete({
      where: { id },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });
  }

  async deleteMany(where: PostWhereInput): Promise<number> {
    const { count } = await client.post.deleteMany({ where });
    return count;
  }

  async exists(title: string): Promise<boolean> {
    const post = await client.post.findFirst({
      where: {
        title: {
          equals: title,
          mode: 'insensitive',
        },
      },
      select: { id: true },
    });
    return !!post;
  }

  async count(where: PostWhereInput): Promise<number> {
    return await client.post.count({ where });
  }

  async getPublishedYears(): Promise<number[]> {
    const res = await client.post.findMany({
      where: {
        status: 'PUBLISHED',
        publishedAt: {
          not: null,
        },
      },
      select: {
        publishedAt: true,
      },
    });

    return res
      .filter((d) => d.publishedAt)
      .map((d) => new Date(d.publishedAt!).getFullYear())
      .reduce(
        (acc, val) => (acc.includes(val) ? acc : [...acc, val]),
        [] as number[]
      );
  }
}
