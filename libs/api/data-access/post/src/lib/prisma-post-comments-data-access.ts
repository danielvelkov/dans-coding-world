import {
  client,
  Comment,
  CommentsOrderByInput,
  CommentWhereInput,
} from '@dans-coding-world/prisma-schema';
import { ICommentRepository } from '@dans-coding-world/shared-data-access-interfaces';

export class PrismaPostCommentsDataAccess
  implements
    ICommentRepository<Comment, CommentWhereInput, CommentsOrderByInput>
{
  async getById(
    id: number,
    options?: { includeReplies?: boolean }
  ): Promise<Comment | null> {
    return await client.comment.findFirst({
      where: {
        id,
      },
      include: {
        replies: options?.includeReplies,
      },
    });
  }

  async search(
    where?: CommentWhereInput,
    orderBy?: CommentsOrderByInput,
    options?: {
      skip?: number;
      take?: number;
      includeReplies?: boolean;
    }
  ): Promise<Comment[]> {
    return await client.comment.findMany({
      where,
      orderBy,
      include: {
        replies: options?.includeReplies,
      },
      take: options?.take,
      skip: options?.skip,
    });
  }

  async create(data: Omit<Comment, 'id'>): Promise<Comment> {
    return await client.comment.create({
      data,
    });
  }

  async update(id: number, data: Partial<Comment>): Promise<Comment> {
    return await client.comment.update({
      where: {
        id,
      },
      data,
    });
  }

  async delete(id: number): Promise<Comment> {
    return await client.comment.delete({
      where: {
        id,
      },
    });
  }

  async deleteMany(where: CommentWhereInput): Promise<number> {
    const { count } = await client.comment.deleteMany({
      where,
    });
    return count;
  }

  async count(where: CommentWhereInput): Promise<number> {
    return await client.comment.count({
      where,
    });
  }
}
