import { Prisma, Comment } from '../generated/prisma/client.js';

export type {
  User,
  Role,
  RefreshToken,
  Post,
  PostStatus,
  PostVisibility,
  Comment,
  Tag,
  Report,
} from '../generated/prisma/client.js';

export type UserWhereInput = Prisma.UserWhereInput;
export type RefreshTokenWhereInput = Prisma.RefreshTokenWhereInput;
export type PostWhereInput = Prisma.PostWhereInput;
export type PostOrderByInput = Prisma.PostOrderByWithRelationInput;
export type CommentWhereInput = Prisma.CommentWhereInput;
export type CommentsOrderByInput = Prisma.CommentOrderByWithRelationInput;
export type TagWhereInput = Prisma.TagWhereInput;
export type TagsOrderByInput = Prisma.TagOrderByWithRelationInput;

export type CommentWithReplies = Comment & {
  replies: CommentWithReplies[];
  replyCount: number;
};
