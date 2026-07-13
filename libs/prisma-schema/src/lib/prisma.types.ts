import { Prisma } from '../generated/prisma/client.js';

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
  ReportHistory,
  ReportStatus,
  Profile,
} from '../generated/prisma/client.js';

export type UserWhereInput = Prisma.UserWhereInput;
export type UserOrderByInput = Prisma.UserOrderByWithRelationInput;
export type RefreshTokenWhereInput = Prisma.RefreshTokenWhereInput;
export type PostWhereInput = Prisma.PostWhereInput;
export type PostOrderByInput = Prisma.PostOrderByWithRelationInput;
export type CommentWhereInput = Prisma.CommentWhereInput;
export type CommentsOrderByInput = Prisma.CommentOrderByWithRelationInput;
export type TagWhereInput = Prisma.TagWhereInput;
export type TagsOrderByInput = Prisma.TagOrderByWithRelationInput;
export type ReportWhereInput = Prisma.ReportWhereInput;
export type ReportOrderByInput = Prisma.ReportOrderByWithRelationInput;
export type ReportHistoryWhereInput = Prisma.ReportHistoryWhereInput;
export type ReportHistoryOrderByInput =
  Prisma.ReportHistoryOrderByWithRelationInput;

export type CommentWithReplies = Prisma.CommentGetPayload<{
  include: {
    user: {
      include: {
        profile: true;
      };
      omit: { password: true; email: true; isBanned: true; role: true };
    };
  };
}> & {
  replies: CommentWithReplies[];
  replyCount: number;
};

export type PostWithAuthorProfile = Prisma.PostGetPayload<{
  include: {
    author: {
      include: { profile: true };
      omit: { password: true; email: true; isBanned: true; role: true };
    };
  };
}>;

export type UserPreview = Prisma.UserGetPayload<{
  include: {
    profile: true;
  };
  omit: { password: true; email: true; isBanned: true; role: true };
}>;
