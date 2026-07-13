import { client } from '@dans-coding-world/prisma-schema';
import type {
  Comment,
  CommentsOrderByInput,
  CommentWhereInput,
} from '@dans-coding-world/prisma-schema';
import { ICommentRepository } from '@dans-coding-world/shared-data-access-interfaces';
import { COMMENT_CONSTRAINTS } from '@dans-coding-world/shared-constants';

export class PrismaPostCommentsDataAccess implements ICommentRepository<
  Comment,
  CommentWhereInput,
  CommentsOrderByInput
> {
  async getById(
    id: number,
    options?: {
      includeReplies?: boolean;
      maxReplyTreeDepth?: number;
    },
  ): Promise<Comment | null> {
    return await client.comment.findFirst({
      where: {
        id,
      },
      ...(options?.includeReplies &&
        this.buildPrismaCommentIncludeQuery(
          options.maxReplyTreeDepth ?? COMMENT_CONSTRAINTS.MAX_REPLY_TREE_DEPTH,
        )),
    });
  }

  async search(
    where?: CommentWhereInput,
    orderBy?: CommentsOrderByInput,
    options?: {
      skip?: number;
      take?: number;
      includeReplies?: boolean;
      maxReplyTreeDepth?: number;
    },
  ): Promise<Comment[]> {
    return await client.comment.findMany({
      where,
      orderBy,
      ...(options?.includeReplies &&
        this.buildPrismaCommentIncludeQuery(
          options.maxReplyTreeDepth ?? COMMENT_CONSTRAINTS.MAX_REPLY_TREE_DEPTH,
        )),
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

  private buildPrismaCommentIncludeQuery(depth: number): any {
    const userInclude = {
      omit: { password: true, email: true, isBanned: true, role: true },
      include: { profile: true },
    };

    if (depth <= 1) {
      return { include: { user: userInclude } };
    }

    return {
      include: {
        user: userInclude,
        replies: this.buildPrismaCommentIncludeQuery(depth - 1),
      },
    };
  }
}
