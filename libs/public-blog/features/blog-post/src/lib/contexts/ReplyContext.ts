import { useCreateComment } from '@dans-coding-world/public-blog-shared-hooks';
import { createContext } from 'react';

export const ReplyContext = createContext<ReplyContextValue | null>(null);

export type ReplyContextValue = {
  selectedCommentForReplyId: number | null;
  setSelectedCommentForReplyId: (id: number | null) => void;
  onReplySubmit: (val: string) => void;
  isSubmittingReply: boolean;
  replyError: ReturnType<typeof useCreateComment>['error'];
};
